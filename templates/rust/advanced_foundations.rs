// CodeAps Starter Template: RUST - ADVANCED FOUNDATIONS\n
// --- EXECUTIVE SUITE: GENERIC STACK ---
// Type-safe modular stack with proper Error Handling

#[derive(Debug)]
pub struct Stack<T> {
    elements: Vec<T>,
    capacity: usize,
}

impl<T> Stack<T> {
    pub fn new(capacity: usize) -> Self {
        Stack {
            elements: Vec::with_capacity(capacity),
            capacity,
        }
    }

    pub fn push(&mut self, item: T) -> Result<(), &str> {
        if self.elements.len() < self.capacity {
            self.elements.push(item);
            Ok(())
        } else {
            Err("Buffer Overflow")
        }
    }

    pub fn pop(&mut self) -> Option<T> {
        self.elements.pop()
    }

    pub fn peek(&self) -> Option<&T> {
        self.elements.last()
    }
}

fn main() {
    let mut brain = Stack::new(3);
    
    match brain.push("Neural Link Alpha") {
        Ok(_) => println!("Synapse active."),
        Err(e) => println!("Warning: {}", e),
    }

    if let Some(data) = brain.peek() {
        println!("Buffer Top: {}", data);
    }
}
