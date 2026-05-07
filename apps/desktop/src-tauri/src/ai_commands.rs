use serde_json::Value;

#[tauri::command]
pub fn ai_proxy_request(
    base_url: String,
    api_key: String,
    body: Value,
) -> Result<Value, String> {
    let url = format!("{}/chat/completions", base_url.trim_end_matches('/'));
    let req = ureq::post(&url)
        .header("Authorization", &format!("Bearer {}", api_key))
        .header("Content-Type", "application/json");

    let res = req
        .send_json(body)
        .map_err(|e| format!("API 요청 실패: {}", e))?;

    let json: Value = res
        .into_body()
        .read_json()
        .map_err(|e| format!("JSON 파싱 실패: {}", e))?;

    Ok(json)
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

    let json: Value = res
        .into_body()
        .read_json()
        .map_err(|e| format!("JSON 파싱 실패: {}", e))?;

    Ok(json)
}
