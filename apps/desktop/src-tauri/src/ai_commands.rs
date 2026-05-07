use serde_json::Value;
use std::{thread, time::Duration};

fn do_request(url: &str, api_key: &str, body: &Value) -> Result<Value, String> {
    let req = ureq::post(url)
        .header("Authorization", &format!("Bearer {}", api_key))
        .header("Content-Type", "application/json");

    let res = req
        .send_json(body.clone())
        .map_err(|e| format!("API 요청 실패: {}", e))?;

    let status = res.status();
    let json: Value = res
        .into_body()
        .read_json()
        .map_err(|e| format!("JSON 파싱 실패: {}", e))?;

    if status.is_client_error() || status.is_server_error() {
        let err_msg = json
            .get("error")
            .and_then(|e| e.get("message"))
            .and_then(|m| m.as_str())
            .unwrap_or("알 수 없는 오류");
        return Err(format!("API 오류 ({}): {}", status.as_u16(), err_msg));
    }

    Ok(json)
}

#[tauri::command]
pub fn ai_proxy_request(
    base_url: String,
    api_key: String,
    body: Value,
) -> Result<Value, String> {
    let url = format!("{}/chat/completions", base_url.trim_end_matches('/'));

    let mut last_err = String::new();
    for attempt in 0..3 {
        if attempt > 0 {
            thread::sleep(Duration::from_millis(1000));
        }
        match do_request(&url, &api_key, &body) {
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
}

#[tauri::command]
pub fn ai_proxy_models(
    base_url: String,
    api_key: String,
) -> Result<Value, String> {
    let url = format!("{}/models", base_url.trim_end_matches('/'));
    let res = ureq::get(&url)
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
}
