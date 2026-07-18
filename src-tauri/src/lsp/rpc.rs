use std::io::{Error, ErrorKind};
use bytes::{Buf, BytesMut};
use tokio_util::codec::{Decoder, Encoder};
use serde_json::Value;

pub struct LspCodec;

impl Decoder for LspCodec {
    type Item = Value;
    type Error = Error;

    fn decode(&mut self, src: &mut BytesMut) -> Result<Option<Self::Item>, Self::Error> {
        let src_str = String::from_utf8_lossy(src);
        
        // Find "Content-Length: "
        if let Some(content_length_pos) = src_str.find("Content-Length: ") {
            let start = content_length_pos + "Content-Length: ".len();
            if let Some(end) = src_str[start..].find("\r\n") {
                let length_str = &src_str[start..start + end];
                let length: usize = length_str.parse().map_err(|_| Error::new(ErrorKind::InvalidData, "Invalid Content-Length"))?;
                
                // Find start of body ("\r\n\r\n")
                if let Some(body_start_rel) = src_str[start + end..].find("\r\n\r\n") {
                    let header_end = start + end + body_start_rel + 4;
                    
                    if src.len() >= header_end + length {
                        // We have the full message
                        src.advance(header_end);
                        let body = src.split_to(length);
                        let json: Value = serde_json::from_slice(&body).map_err(|e| Error::new(ErrorKind::InvalidData, e))?;
                        return Ok(Some(json));
                    }
                }
            }
        }
        
        Ok(None)
    }
}

impl Encoder<Value> for LspCodec {
    type Error = Error;

    fn encode(&mut self, item: Value, dst: &mut BytesMut) -> Result<(), Self::Error> {
        let body = serde_json::to_string(&item).map_err(|e| Error::new(ErrorKind::InvalidData, e))?;
        let header = format!("Content-Length: {}\r\n\r\n", body.len());
        
        dst.extend_from_slice(header.as_bytes());
        dst.extend_from_slice(body.as_bytes());
        Ok(())
    }
}
