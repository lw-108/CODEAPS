use serde::Serialize;

#[derive(Debug, Serialize)]
#[allow(dead_code)]
pub enum AppError {
    FileSystem(String),
    Backend(String),
    Terminal(String),
    AI(String),
}

impl From<std::io::Error> for AppError {
    fn from(err: std::io::Error) -> Self {
        AppError::FileSystem(err.to_string())
    }
}
