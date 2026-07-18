import os

def create_file(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content.strip() + '\n')

def main():
    root = "templates"
    
    languages = {
        "python": {
            "ext": "py",
            "topics": {
                "variables": "name = 'Neural Engine'\nversion = 3.1",
                "data_types": "raw_data = [1, 2, 3]\nconfig = {'key': 'val'}",
                "input_output": "val = input('Prompt: ')\nprint(val)",
                "conditional_statements": "if True:\n    print('Logic High')",
                "loops": "for i in range(5):\n    print(i)",
                "functions": "def boot():\n    return True",
                "object_oriented_programming": "class Arch:\n    pass",
                "basic_data_structures": "stack = []\nqueue = []",
                "error_handling": "try:\n    1/0\nexcept ZeroDivisionError:\n    pass",
                "modules_or_imports": "import os\nfrom math import sqrt",
                "advanced_foundations": """
# --- EXECUTIVE SUITE: STACK DATA STRUCTURE ---
# Neatly explained Stack implementation with Menu System

class Stack:
    def __init__(self, capacity=10):
        self.stack = []
        self.capacity = capacity

    def is_full(self):
        return len(self.stack) >= self.capacity

    def is_empty(self):
        return len(self.stack) == 0

    def push(self, data):
        if self.is_full():
            print("System Alert: Buffer Overflow")
            return
        self.stack.append(data)
        print(f"Pushed: {data}")

    def pop(self):
        if self.is_empty():
            print("System Alert: Buffer Underflow")
            return None
        return self.stack.pop()

    def peek(self):
        if not self.is_empty():
            return self.stack[-1]
        return None

def main_loop():
    s = Stack(5)
    while True:
        print("\\n--- NEURAL STACK MANAGER ---")
        print("1. Push (Initialize Data)")
        print("2. Pop (Purge Data)")
        print("3. Peek (Analyze Top)")
        print("4. Exit")
        choice = input("Select operation: ")

        if choice == '1':
            item = input("Enter data to push: ")
            s.push(item)
        elif choice == '2':
            item = s.pop()
            if item: print(f"Popped: {item}")
        elif choice == '3':
            item = s.peek()
            print(f"Top element: {item}")
        elif choice == '4':
            print("Exiting Neural Manager...")
            break
        else:
            print("Invalid Identity Operation.")

if __name__ == "__main__":
    main_loop()
""",
                "main_program_template": "if __name__ == '__main__':\n    print('Active')"
            }
        },
        "javascript": {
            "ext": "js",
            "topics": {
                "variables": "let name = 'Neural';\nconst ver = 3.1;",
                "advanced_foundations": """
// --- EXECUTIVE SUITE: ASYNC TASK HUB ---
// Real-world pattern for handling asynchronous task queues

class TaskHub {
    constructor() {
        this.queue = [];
        this.active = false;
    }

    addTask(name, duration) {
        console.log(`[QUEUED] ${name} (${duration}ms)`);
        this.queue.push({ name, duration });
        if (!this.active) this.process();
    }

    async process() {
        if (this.queue.length === 0) {
            this.active = false;
            console.log("[IDLE] System ready.");
            return;
        }

        this.active = true;
        const task = this.queue.shift();
        console.log(`[START] Processing ${task.name}...`);
        
        await new Promise(r => setTimeout(r, task.duration));
        
        console.log(`[COMPLETE] Finished ${task.name}`);
        this.process();
    }
}

const hub = new TaskHub();
hub.addTask("Neural Sync", 2000);
hub.addTask("LSP Boot", 1000);
hub.addTask("IO Flush", 500);
"""
            }
        },
        "rust": {
            "ext": "rs",
            "topics": {
                "advanced_foundations": """
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
"""
            }
        },
        "c": {
            "ext": "c",
            "topics": {
                "advanced_foundations": """
// --- EXECUTIVE SUITE: C DYNAMIC STACK ---
// High-performance manual memory management example

#include <stdio.h>
#include <stdlib.h>

typedef struct {
    int *array;
    int top;
    int capacity;
} Stack;

Stack* createStack(int cap) {
    Stack *s = (Stack*)malloc(sizeof(Stack));
    s->array = (int*)malloc(cap * sizeof(int));
    s->top = -1;
    s->capacity = cap;
    return s;
}

void push(Stack *s, int val) {
    if (s->top < s->capacity - 1) {
        s->array[++(s->top)] = val;
        printf("Pushed: %d\\n", val);
    }
}

int pop(Stack *s) {
    if (s->top >= 0) {
        return s->array[(s->top)--];
    }
    return -1;
}

int main() {
    Stack *myStack = createStack(10);
    push(myStack, 42);
    push(myStack, 1337);
    
    printf("Popped: %d\\n", pop(myStack));
    return 0;
}
"""
            }
        },
        "java": {
            "ext": "java",
            "topics": {
                "advanced_foundations": """
// --- EXECUTIVE SUITE: JAVA STACK ARCHITECTURE ---
// Neatly explained Stack with Generic implementation and Menu logic

import java.util.Scanner;

class Stack<T> {
    private Object[] elements;
    private int top = -1;
    private int capacity;

    public Stack(int cap) {
        this.capacity = cap;
        this.elements = new Object[cap];
    }

    public void push(T val) {
        if (top < capacity - 1) {
            elements[++top] = val;
            System.out.println("Neural Link Established: " + val);
        } else {
            System.err.println("Critical Error: Buffer Overflow");
        }
    }

    @SuppressWarnings("unchecked")
    public T pop() {
        if (top >= 0) return (T)elements[top--];
        System.err.println("Critical Error: Buffer Underflow");
        return null;
    }

    @SuppressWarnings("unchecked")
    public T peek() {
        if (top >= 0) return (T)elements[top];
        return null;
    }

    public static void main(String[] args) {
        Stack<String> stack = new Stack<>(5);
        Scanner sc = new Scanner(System.in);
        
        while(true) {
            System.out.println("\\n--- JAVA NEURAL LAYER ---");
            System.out.println("1. Push | 2. Pop | 3. Peek | 4. Exit");
            String choice = sc.nextLine();
            
            if (choice.equals("1")) {
                System.out.print("Enter value: ");
                stack.push(sc.nextLine());
            } else if (choice.equals("2")) {
                System.out.println("Popped: " + stack.pop());
            } else if (choice.equals("3")) {
                System.out.println("Top: " + stack.peek());
            } else if (choice.equals("4")) break;
        }
    }
}
"""
            }
        }
    }

    for lang, data in languages.items():
        lang_dir = f"{root}/{lang}"
        for topic, content in data["topics"].items():
            file_path = f"{lang_dir}/{topic}.{data['ext']}"
            header = f"// CodeAps Starter Template: {lang.upper()} - {topic.replace('_', ' ').upper()}\\n"
            create_file(file_path, header + content)

    print("Executive Foundation modules generated.")

if __name__ == "__main__":
    main()
