use serde_json::Value;
use std::io::Read;
use std::{thread, time::Duration};
use tauri::{AppHandle, Emitter};

fn http_agent() -> ureq::Agent {
    let config = ureq::Agent::config_builder()
        .timeout_global(Some(Duration::from_secs(600)))
        .build();
    ureq::Agent::new_with_config(config)
}

fn parse_error_json(body: &str) -> String {
    match serde_json::from_str::<Value>(body) {
        Ok(v) => v
            .get("error")
            .and_then(|e| e.get("message"))
            .and_then(|m| m.as_str())
            .map(|s| s.to_string())
            .unwrap_or_else(|| "알 수 없는 오류".to_string()),
        Err(_) => "알 수 없는 오류".to_string(),
    }
}

fn emit_delta(app: &AppHandle, chunk: &Value) {
    let Some(delta) = chunk.pointer("/choices/0/delta") else { return };
    for (field, kind) in [("reasoning_content", "reasoning"), ("content", "content")] {
        if let Some(t) = delta.get(field).and_then(|v| v.as_str()) {
            if !t.is_empty() {
                let _ = app.emit("ai-chunk", serde_json::json!({ "type": kind, "text": t }));
            }
        }
    }
}

fn accumulate_delta(acc: &mut Accumulated, chunk: &Value) {
    let Some(delta) = chunk.pointer("/choices/0/delta") else { return };
    if let Some(t) = delta.get("content").and_then(|v| v.as_str()) {
        acc.content.push_str(t);
    }
    if let Some(t) = delta.get("reasoning_content").and_then(|v| v.as_str()) {
        acc.reasoning.push_str(t);
    }
    let Some(tcs) = delta.get("tool_calls").and_then(|v| v.as_array()) else { return };
    for tc in tcs {
        let idx = tc.get("index").and_then(|i| i.as_u64()).unwrap_or(0) as usize;
        while acc.tool_calls.len() <= idx {
            acc.tool_calls.push(serde_json::json!({
                "id": "", "type": "function", "function": { "name": "", "arguments": "" }
            }));
        }
        let slot = &mut acc.tool_calls[idx];
        if let Some(id) = tc.get("id").and_then(|v| v.as_str()) {
            slot["id"] = id.into();
        }
        if let Some(name) = tc.pointer("/function/name").and_then(|v| v.as_str()) {
            slot["function"]["name"] = name.into();
        }
        if let Some(args) = tc.pointer("/function/arguments").and_then(|v| v.as_str()) {
            let prev = slot["function"]["arguments"].as_str().unwrap_or("");
            slot["function"]["arguments"] = format!("{}{}", prev, args).into();
        }
    }
}

struct Accumulated {
    content: String,
    reasoning: String,
    tool_calls: Vec<Value>,
}

impl Accumulated {
    fn to_response(&self) -> Value {
        let mut message = serde_json::json!({ "role": "assistant", "content": Value::Null });
        if !self.content.is_empty() {
            message["content"] = self.content.clone().into();
        }
        if !self.reasoning.is_empty() {
            message["reasoning_content"] = self.reasoning.clone().into();
        }
        if !self.tool_calls.is_empty() {
            message["tool_calls"] = Value::Array(self.tool_calls.clone());
        }
        serde_json::json!({ "choices": [{ "message": message }] })
    }
}

fn do_request(app: &AppHandle, url: &str, api_key: &str, body: &Value) -> Result<Value, String> {
    let mut req_body = body.clone();
    if let Some(obj) = req_body.as_object_mut() {
        obj.insert("stream".into(), Value::Bool(true));
    }

    let req = http_agent().post(url)
        .header("Authorization", &format!("Bearer {}", api_key))
        .header("Content-Type", "application/json");

    let res = req
        .send_json(req_body)
        .map_err(|e| format!("API 요청 실패: {}", e))?;

    let status = res.status();
    let mut body_str = String::new();
    res.into_body()
        .into_reader()
        .read_to_string(&mut body_str)
        .map_err(|e| format!("응답 읽기 실패: {}", e))?;

    if status.is_client_error() || status.is_server_error() {
        return Err(format!("API 오류 ({}): {}", status.as_u16(), parse_error_json(&body_str)));
    }

    // SSE 스트리밍 파싱: `data: {json}` 라인. 마지막 청크만으론 부족하니 델타를 누적해 전체 응답을 재구성한다.
    let mut acc = Accumulated { content: String::new(), reasoning: String::new(), tool_calls: Vec::new() };
    let mut saw_delta = false;
    for line in body_str.lines() {
        let line = line.trim();
        if let Some(data) = line.strip_prefix("data:") {
            let data = data.trim();
            if data == "[DONE]" {
                break;
            }
            if let Ok(v) = serde_json::from_str::<Value>(data) {
                emit_delta(app, &v);
                accumulate_delta(&mut acc, &v);
                saw_delta = true;
            }
        }
    }
    if saw_delta {
        return Ok(acc.to_response());
    }

    // SSE 미지원 프록시 대비: 일반 JSON 응답 처리
    serde_json::from_str::<Value>(&body_str).map_err(|e| format!("JSON 파싱 실패: {}", e))
}

#[tauri::command]
pub async fn ai_proxy_request(
    app: AppHandle,
    base_url: String,
    api_key: String,
    body: Value,
) -> Result<Value, String> {
    let url = format!("{}/chat/completions", base_url.trim_end_matches('/'));

    // Run HTTP on a dedicated thread to avoid blocking the Tauri thread pool
    let result = tauri::async_runtime::spawn_blocking(move || {
        let mut last_err = String::new();
        for attempt in 0..3 {
            if attempt > 0 {
                thread::sleep(Duration::from_millis(1000));
            }
            match do_request(&app, &url, &api_key, &body) {
                Ok(v) => return Ok(v),
                Err(e) => {
                    last_err = e;
                    if !last_err.contains("500") && !last_err.contains("502") && !last_err.contains("503") {
                        break;
                    }
                }
            }
        }
        Err(last_err)
    })
    .await
    .map_err(|e| format!("내부 오류: {}", e))?;

    result
}

#[tauri::command]
pub async fn ai_proxy_models(
    base_url: String,
    api_key: String,
) -> Result<Value, String> {
    let url = format!("{}/models", base_url.trim_end_matches('/'));

    tauri::async_runtime::spawn_blocking(move || {
        let res = http_agent().get(&url)
            .header("Authorization", &format!("Bearer {}", api_key))
            .call()
            .map_err(|e| format!("모델 목록 요청 실패: {}", e))?;

        let status = res.status();
        let json: Value = res
            .into_body()
            .read_json()
            .map_err(|e| format!("JSON 파싱 실패: {}", e))?;

        if status.is_client_error() || status.is_server_error() {
            return Err(format!("모델 API 오류: {}", status.as_u16()));
        }
        Ok(json)
    })
    .await
    .map_err(|e| format!("내부 오류: {}", e))?
}