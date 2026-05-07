use std::path::PathBuf;
use std::process::{Child, Command};
use std::sync::Mutex;

pub struct AiServer {
    child: Option<Child>,
}

fn find_opencode() -> Option<PathBuf> {
    // 1. Try global PATH
    if let Ok(path) = which::which("opencode") {
        return Some(path);
    }
    // 2. Try npm global prefix
    if let Ok(output) = Command::new("npm").args(["prefix", "-g"]).output() {
        let prefix = String::from_utf8_lossy(&output.stdout).trim().to_string();
        let candidate = PathBuf::from(&prefix).join("opencode.cmd");
        if candidate.exists() {
            return Some(candidate);
        }
        let candidate = PathBuf::from(&prefix).join("opencode");
        if candidate.exists() {
            return Some(candidate);
        }
    }
    // 3. Try common npm global locations on Windows
    if cfg!(windows) {
        if let Ok(appdata) = std::env::var("APPDATA") {
            let candidate = PathBuf::from(&appdata).join("npm").join("opencode.cmd");
            if candidate.exists() {
                return Some(candidate);
            }
        }
    }
    None
}

impl AiServer {
    pub fn start() -> Result<Self, String> {
        let opencode_path = find_opencode().ok_or_else(|| {
            "opencode를 찾을 수 없습니다. opencode가 설치되어 있고 PATH에 등록되어 있는지 확인하세요.".to_string()
        })?;

        let child = Command::new(&opencode_path)
            .args(["serve", "--port", "4096"])
            .stdout(std::process::Stdio::null())
            .stderr(std::process::Stdio::null())
            .spawn()
            .map_err(|e| {
                format!(
                    "opencode 서버 시작 실패 ({}): {}",
                    opencode_path.display(),
                    e
                )
            })?;

        Ok(AiServer {
            child: Some(child),
        })
    }

    pub fn stop(&mut self) {
        if let Some(mut child) = self.child.take() {
            let _ = child.kill();
            let _ = child.wait();
        }
    }
}

impl Drop for AiServer {
    fn drop(&mut self) {
        self.stop();
    }
}

pub type AiServerState = Mutex<Option<AiServer>>;

pub fn start_ai_server(state: &AiServerState) {
    match AiServer::start() {
        Ok(server) => {
            *state.lock().unwrap() = Some(server);
        }
        Err(err) => {
            eprintln!("[ai_server] {}", err);
        }
    }
}

pub fn stop_ai_server(state: &AiServerState) {
    if let Ok(mut guard) = state.lock() {
        if let Some(mut server) = guard.take() {
            server.stop();
        }
    }
}
