export interface TemplateTopic {
    id: string;
    content: string;
}

export interface LanguageTemplates {
    id: string;
    topics: Record<string, string>;
}

export const FULL_TEMPLATES: Record<string, LanguageTemplates> = {
    "c": {
        "id": "c",
        "topics": {
            "advanced_foundations": "// CodeAps Starter Template: C - ADVANCED FOUNDATIONS\\n\n// --- EXECUTIVE SUITE: C DYNAMIC STACK ---\n// High-performance manual memory management example\n\n#include <stdio.h>\n#include <stdlib.h>\n\ntypedef struct {\n    int *array;\n    int top;\n    int capacity;\n} Stack;\n\nStack* createStack(int cap) {\n    Stack *s = (Stack*)malloc(sizeof(Stack));\n    s->array = (int*)malloc(cap * sizeof(int));\n    s->top = -1;\n    s->capacity = cap;\n    return s;\n}\n\nvoid push(Stack *s, int val) {\n    if (s->top < s->capacity - 1) {\n        s->array[++(s->top)] = val;\n        printf(\"Pushed: %d\\n\", val);\n    }\n}\n\nint pop(Stack *s) {\n    if (s->top >= 0) {\n        return s->array[(s->top)--];\n    }\n    return -1;\n}\n\nint main() {\n    Stack *myStack = createStack(10);\n    push(myStack, 42);\n    push(myStack, 1337);\n    \n    printf(\"Popped: %d\\n\", pop(myStack));\n    return 0;\n}\n",
            "basic_data_structures": "// CodeAps Starter Template: C - Basic data structures\nint arr[5];\n",
            "conditional_statements": "// CodeAps Starter Template: C - Conditional statements\nif (1) { }\n",
            "data_types": "// CodeAps Starter Template: C - Data types\nfloat ver = 3.1;\n",
            "error_handling": "// CodeAps Starter Template: C - Error handling\nreturn -1;\n",
            "functions": "// CodeAps Starter Template: C - Functions\nvoid boot() { }\n",
            "input_output": "// CodeAps Starter Template: C - Input output\nprintf('Output');\n",
            "loops": "// CodeAps Starter Template: C - Loops\nfor (int i=0; i<5; i++) { }\n",
            "main_program_template": "// CodeAps Starter Template: C - Main program template\nint main() { return 0; }\n",
            "modules_or_imports": "// CodeAps Starter Template: C - Modules or imports\n#include <stdio.h>\n",
            "object_oriented_programming": "// CodeAps Starter Template: C - Object oriented programming\n// Not supported natively in C\n",
            "starter_template": "// CodeAps Executive Starter: C\n\n// --- VARIABLES ---\nint id = 101;\n\n// --- DATA_TYPES ---\nfloat ver = 3.1;\n\n// --- INPUT_OUTPUT ---\nprintf('Output');\n\n// --- CONDITIONAL_STATEMENTS ---\nif (1) { }\n\n// --- LOOPS ---\nfor (int i=0; i<5; i++) { }\n\n// --- FUNCTIONS ---\nvoid boot() { }\n\n// --- OBJECT_ORIENTED_PROGRAMMING ---\n// Not supported natively in C\n\n// --- BASIC_DATA_STRUCTURES ---\nint arr[5];\n\n// --- ERROR_HANDLING ---\nreturn -1;\n\n// --- MODULES_OR_IMPORTS ---\n#include <stdio.h>\n\n// --- MAIN_PROGRAM_TEMPLATE ---\nint main() { return 0; }\n",
            "variables": "// CodeAps Starter Template: C - Variables\nint id = 101;\n"
        }
    },
    "cpp": {
        "id": "cpp",
        "topics": {
            "basic_data_structures": "// CodeAps Starter Template: CPP - Basic data structures\nstd::vector<int> v;\n",
            "conditional_statements": "// CodeAps Starter Template: CPP - Conditional statements\nif (true) { }\n",
            "data_types": "// CodeAps Starter Template: CPP - Data types\nbool active = true;\n",
            "error_handling": "// CodeAps Starter Template: CPP - Error handling\ntry { throw 1; } catch(...) { }\n",
            "functions": "// CodeAps Starter Template: CPP - Functions\nauto boot() { return true; }\n",
            "input_output": "// CodeAps Starter Template: CPP - Input output\nstd::cout << 'OK';\n",
            "loops": "// CodeAps Starter Template: CPP - Loops\nwhile (false) { }\n",
            "main_program_template": "// CodeAps Starter Template: CPP - Main program template\nint main() { return 0; }\n",
            "modules_or_imports": "// CodeAps Starter Template: CPP - Modules or imports\n#include <iostream>\n",
            "object_oriented_programming": "// CodeAps Starter Template: CPP - Object oriented programming\nclass Neural { public: Neural(); };\n",
            "starter_template": "// CodeAps Executive Starter: CPP\n\n// --- VARIABLES ---\nint id = 101;\n\n// --- DATA_TYPES ---\nbool active = true;\n\n// --- INPUT_OUTPUT ---\nstd::cout << 'OK';\n\n// --- CONDITIONAL_STATEMENTS ---\nif (true) { }\n\n// --- LOOPS ---\nwhile (false) { }\n\n// --- FUNCTIONS ---\nauto boot() { return true; }\n\n// --- OBJECT_ORIENTED_PROGRAMMING ---\nclass Neural { public: Neural(); };\n\n// --- BASIC_DATA_STRUCTURES ---\nstd::vector<int> v;\n\n// --- ERROR_HANDLING ---\ntry { throw 1; } catch(...) { }\n\n// --- MODULES_OR_IMPORTS ---\n#include <iostream>\n\n// --- MAIN_PROGRAM_TEMPLATE ---\nint main() { return 0; }\n",
            "variables": "// CodeAps Starter Template: CPP - Variables\nint id = 101;\n"
        }
    },
    "html": {
        "id": "html",
        "topics": {
            "main_program_template": "// CodeAps Starter Template: HTML - Main program template\n<!DOCTYPE html>\n<html>\n<body>\n  <h1>Neural Dashboard</h1>\n</body>\n</html>\n",
            "starter_template": "// CodeAps Executive Starter: HTML\n\n// --- MAIN_PROGRAM_TEMPLATE ---\n<!DOCTYPE html>\n<html>\n<body>\n  <h1>Neural Dashboard</h1>\n</body>\n</html>\n"
        }
    },
    "java": {
        "id": "java",
        "topics": {
            "advanced_foundations": "// CodeAps Starter Template: JAVA - ADVANCED FOUNDATIONS\\n\n// --- EXECUTIVE SUITE: JAVA STACK ARCHITECTURE ---\n// Neatly explained Stack with Generic implementation and Menu logic\n\nimport java.util.Scanner;\n\nclass Stack<T> {\n    private Object[] elements;\n    private int top = -1;\n    private int capacity;\n\n    public Stack(int cap) {\n        this.capacity = cap;\n        this.elements = new Object[cap];\n    }\n\n    public void push(T val) {\n        if (top < capacity - 1) {\n            elements[++top] = val;\n            System.out.println(\"Neural Link Established: \" + val);\n        } else {\n            System.err.println(\"Critical Error: Buffer Overflow\");\n        }\n    }\n\n    @SuppressWarnings(\"unchecked\")\n    public T pop() {\n        if (top >= 0) return (T)elements[top--];\n        System.err.println(\"Critical Error: Buffer Underflow\");\n        return null;\n    }\n\n    @SuppressWarnings(\"unchecked\")\n    public T peek() {\n        if (top >= 0) return (T)elements[top];\n        return null;\n    }\n\n    public static void main(String[] args) {\n        Stack<String> stack = new Stack<>(5);\n        Scanner sc = new Scanner(System.in);\n        \n        while(true) {\n            System.out.println(\"\\n--- JAVA NEURAL LAYER ---\");\n            System.out.println(\"1. Push | 2. Pop | 3. Peek | 4. Exit\");\n            String choice = sc.nextLine();\n            \n            if (choice.equals(\"1\")) {\n                System.out.print(\"Enter value: \");\n                stack.push(sc.nextLine());\n            } else if (choice.equals(\"2\")) {\n                System.out.println(\"Popped: \" + stack.pop());\n            } else if (choice.equals(\"3\")) {\n                System.out.println(\"Top: \" + stack.peek());\n            } else if (choice.equals(\"4\")) break;\n        }\n    }\n}\n",
            "basic_data_structures": "// CodeAps Starter Template: JAVA - Basic data structures\nArrayList<Integer> l = new ArrayList<>();\n",
            "conditional_statements": "// CodeAps Starter Template: JAVA - Conditional statements\nif (true) { }\n",
            "data_types": "// CodeAps Starter Template: JAVA - Data types\nint[] arr = {1, 2};\n",
            "error_handling": "// CodeAps Starter Template: JAVA - Error handling\ntry { } catch (Exception e) { }\n",
            "functions": "// CodeAps Starter Template: JAVA - Functions\npublic void boot() { }\n",
            "input_output": "// CodeAps Starter Template: JAVA - Input output\nSystem.out.println('OK');\n",
            "loops": "// CodeAps Starter Template: JAVA - Loops\nfor (int i : arr) { }\n",
            "main_program_template": "// CodeAps Starter Template: JAVA - Main program template\npublic static void main(String[] args) { }\n",
            "modules_or_imports": "// CodeAps Starter Template: JAVA - Modules or imports\nimport java.util.*;\n",
            "object_oriented_programming": "// CodeAps Starter Template: JAVA - Object oriented programming\npublic class Neural { }\n",
            "starter_template": "// CodeAps Executive Starter: JAVA\n\n// --- VARIABLES ---\nString name = 'Neural';\n\n// --- DATA_TYPES ---\nint[] arr = {1, 2};\n\n// --- INPUT_OUTPUT ---\nSystem.out.println('OK');\n\n// --- CONDITIONAL_STATEMENTS ---\nif (true) { }\n\n// --- LOOPS ---\nfor (int i : arr) { }\n\n// --- FUNCTIONS ---\npublic void boot() { }\n\n// --- OBJECT_ORIENTED_PROGRAMMING ---\npublic class Neural { }\n\n// --- BASIC_DATA_STRUCTURES ---\nArrayList<Integer> l = new ArrayList<>();\n\n// --- ERROR_HANDLING ---\ntry { } catch (Exception e) { }\n\n// --- MODULES_OR_IMPORTS ---\nimport java.util.*;\n\n// --- MAIN_PROGRAM_TEMPLATE ---\npublic static void main(String[] args) { }\n",
            "variables": "// CodeAps Starter Template: JAVA - Variables\nString name = 'Neural';\n"
        }
    },
    "javascript": {
        "id": "javascript",
        "topics": {
            "advanced_foundations": "// CodeAps Starter Template: JAVASCRIPT - ADVANCED FOUNDATIONS\\n\n// --- EXECUTIVE SUITE: ASYNC TASK HUB ---\n// Real-world pattern for handling asynchronous task queues\n\nclass TaskHub {\n    constructor() {\n        this.queue = [];\n        this.active = false;\n    }\n\n    addTask(name, duration) {\n        console.log(`[QUEUED] ${name} (${duration}ms)`);\n        this.queue.push({ name, duration });\n        if (!this.active) this.process();\n    }\n\n    async process() {\n        if (this.queue.length === 0) {\n            this.active = false;\n            console.log(\"[IDLE] System ready.\");\n            return;\n        }\n\n        this.active = true;\n        const task = this.queue.shift();\n        console.log(`[START] Processing ${task.name}...`);\n        \n        await new Promise(r => setTimeout(r, task.duration));\n        \n        console.log(`[COMPLETE] Finished ${task.name}`);\n        this.process();\n    }\n}\n\nconst hub = new TaskHub();\nhub.addTask(\"Neural Sync\", 2000);\nhub.addTask(\"LSP Boot\", 1000);\nhub.addTask(\"IO Flush\", 500);\n",
            "basic_data_structures": "// CodeAps Starter Template: JAVASCRIPT - Basic data structures\nlet map = new Map();\n",
            "conditional_statements": "// CodeAps Starter Template: JAVASCRIPT - Conditional statements\nif (true) { console.log('OK'); }\n",
            "data_types": "// CodeAps Starter Template: JAVASCRIPT - Data types\nlet arr = [1,2,3];\nlet obj = { x: 1 };\n",
            "error_handling": "// CodeAps Starter Template: JAVASCRIPT - Error handling\ntry { } catch (e) { }\n",
            "functions": "// CodeAps Starter Template: JAVASCRIPT - Functions\nconst boot = () => true;\n",
            "input_output": "// CodeAps Starter Template: JAVASCRIPT - Input output\nconsole.log('Output');\n",
            "loops": "// CodeAps Starter Template: JAVASCRIPT - Loops\nfor (let i=0; i<5; i++) { }\n",
            "main_program_template": "// CodeAps Starter Template: JAVASCRIPT - Main program template\nconsole.log('System Online');\n",
            "modules_or_imports": "// CodeAps Starter Template: JAVASCRIPT - Modules or imports\nimport { x } from './mod';\n",
            "object_oriented_programming": "// CodeAps Starter Template: JAVASCRIPT - Object oriented programming\nclass Neural { constructor() {} }\n",
            "starter_template": "// CodeAps Executive Starter: JAVASCRIPT\n\n// --- VARIABLES ---\nlet name = 'Neural';\nconst ver = 3.1;\n\n// --- DATA_TYPES ---\nlet arr = [1,2,3];\nlet obj = { x: 1 };\n\n// --- INPUT_OUTPUT ---\nconsole.log('Output');\n\n// --- CONDITIONAL_STATEMENTS ---\nif (true) { console.log('OK'); }\n\n// --- LOOPS ---\nfor (let i=0; i<5; i++) { }\n\n// --- FUNCTIONS ---\nconst boot = () => true;\n\n// --- OBJECT_ORIENTED_PROGRAMMING ---\nclass Neural { constructor() {} }\n\n// --- BASIC_DATA_STRUCTURES ---\nlet map = new Map();\n\n// --- ERROR_HANDLING ---\ntry { } catch (e) { }\n\n// --- MODULES_OR_IMPORTS ---\nimport { x } from './mod';\n\n// --- MAIN_PROGRAM_TEMPLATE ---\nconsole.log('System Online');\n",
            "variables": "// CodeAps Starter Template: JAVASCRIPT - VARIABLES\\nlet name = 'Neural';\nconst ver = 3.1;\n"
        }
    },
    "python": {
        "id": "python",
        "topics": {
            "advanced_foundations": "// CodeAps Starter Template: PYTHON - ADVANCED FOUNDATIONS\\n\n# --- EXECUTIVE SUITE: STACK DATA STRUCTURE ---\n# Neatly explained Stack implementation with Menu System\n\nclass Stack:\n    def __init__(self, capacity=10):\n        self.stack = []\n        self.capacity = capacity\n\n    def is_full(self):\n        return len(self.stack) >= self.capacity\n\n    def is_empty(self):\n        return len(self.stack) == 0\n\n    def push(self, data):\n        if self.is_full():\n            print(\"System Alert: Buffer Overflow\")\n            return\n        self.stack.append(data)\n        print(f\"Pushed: {data}\")\n\n    def pop(self):\n        if self.is_empty():\n            print(\"System Alert: Buffer Underflow\")\n            return None\n        return self.stack.pop()\n\n    def peek(self):\n        if not self.is_empty():\n            return self.stack[-1]\n        return None\n\ndef main_loop():\n    s = Stack(5)\n    while True:\n        print(\"\\n--- NEURAL STACK MANAGER ---\")\n        print(\"1. Push (Initialize Data)\")\n        print(\"2. Pop (Purge Data)\")\n        print(\"3. Peek (Analyze Top)\")\n        print(\"4. Exit\")\n        choice = input(\"Select operation: \")\n\n        if choice == '1':\n            item = input(\"Enter data to push: \")\n            s.push(item)\n        elif choice == '2':\n            item = s.pop()\n            if item: print(f\"Popped: {item}\")\n        elif choice == '3':\n            item = s.peek()\n            print(f\"Top element: {item}\")\n        elif choice == '4':\n            print(\"Exiting Neural Manager...\")\n            break\n        else:\n            print(\"Invalid Identity Operation.\")\n\nif __name__ == \"__main__\":\n    main_loop()\n",
            "basic_data_structures": "// CodeAps Starter Template: PYTHON - BASIC DATA STRUCTURES\\nstack = []\nqueue = []\n",
            "conditional_statements": "// CodeAps Starter Template: PYTHON - CONDITIONAL STATEMENTS\\nif True:\n    print('Logic High')\n",
            "data_types": "// CodeAps Starter Template: PYTHON - DATA TYPES\\nraw_data = [1, 2, 3]\nconfig = {'key': 'val'}\n",
            "error_handling": "// CodeAps Starter Template: PYTHON - ERROR HANDLING\\ntry:\n    1/0\nexcept ZeroDivisionError:\n    pass\n",
            "functions": "// CodeAps Starter Template: PYTHON - FUNCTIONS\\ndef boot():\n    return True\n",
            "input_output": "// CodeAps Starter Template: PYTHON - INPUT OUTPUT\\nval = input('Prompt: ')\nprint(val)\n",
            "loops": "// CodeAps Starter Template: PYTHON - LOOPS\\nfor i in range(5):\n    print(i)\n",
            "main_program_template": "// CodeAps Starter Template: PYTHON - MAIN PROGRAM TEMPLATE\\nif __name__ == '__main__':\n    print('Active')\n",
            "modules_or_imports": "// CodeAps Starter Template: PYTHON - MODULES OR IMPORTS\\nimport os\nfrom math import sqrt\n",
            "object_oriented_programming": "// CodeAps Starter Template: PYTHON - OBJECT ORIENTED PROGRAMMING\\nclass Arch:\n    pass\n",
            "starter_template": "// CodeAps Executive Starter: PYTHON\n\n// --- VARIABLES ---\nname = 'Neural Engine'\nversion = 3.1\n\n// --- DATA_TYPES ---\nraw_data = [1, 2, 3]\nconfig = {'key': 'val'}\n\n// --- INPUT_OUTPUT ---\nval = input('Prompt: ')\nprint(val)\n\n// --- CONDITIONAL_STATEMENTS ---\nif True:\n    print('Logic High')\n\n// --- LOOPS ---\nfor i in range(5):\n    print(i)\n\n// --- FUNCTIONS ---\ndef boot():\n    return True\n\n// --- OBJECT_ORIENTED_PROGRAMMING ---\nclass Arch:\n    pass\n\n// --- BASIC_DATA_STRUCTURES ---\nstack = []\nqueue = []\n\n// --- ERROR_HANDLING ---\ntry:\n    1/0\nexcept ZeroDivisionError:\n    pass\n\n// --- MODULES_OR_IMPORTS ---\nimport os\nfrom math import sqrt\n\n// --- MAIN_PROGRAM_TEMPLATE ---\nif __name__ == '__main__':\n    print('Active')\n",
            "variables": "// CodeAps Starter Template: PYTHON - VARIABLES\\nname = 'Neural Engine'\nversion = 3.1\n"
        }
    },
    "rust": {
        "id": "rust",
        "topics": {
            "advanced_foundations": "// CodeAps Starter Template: RUST - ADVANCED FOUNDATIONS\\n\n// --- EXECUTIVE SUITE: GENERIC STACK ---\n// Type-safe modular stack with proper Error Handling\n\n#[derive(Debug)]\npub struct Stack<T> {\n    elements: Vec<T>,\n    capacity: usize,\n}\n\nimpl<T> Stack<T> {\n    pub fn new(capacity: usize) -> Self {\n        Stack {\n            elements: Vec::with_capacity(capacity),\n            capacity,\n        }\n    }\n\n    pub fn push(&mut self, item: T) -> Result<(), &str> {\n        if self.elements.len() < self.capacity {\n            self.elements.push(item);\n            Ok(())\n        } else {\n            Err(\"Buffer Overflow\")\n        }\n    }\n\n    pub fn pop(&mut self) -> Option<T> {\n        self.elements.pop()\n    }\n\n    pub fn peek(&self) -> Option<&T> {\n        self.elements.last()\n    }\n}\n\nfn main() {\n    let mut brain = Stack::new(3);\n    \n    match brain.push(\"Neural Link Alpha\") {\n        Ok(_) => println!(\"Synapse active.\"),\n        Err(e) => println!(\"Warning: {}\", e),\n    }\n\n    if let Some(data) = brain.peek() {\n        println!(\"Buffer Top: {}\", data);\n    }\n}\n",
            "basic_data_structures": "// CodeAps Starter Template: RUST - Basic data structures\nlet mut vec = Vec::new();\n",
            "conditional_statements": "// CodeAps Starter Template: RUST - Conditional statements\nif true { }\n",
            "data_types": "// CodeAps Starter Template: RUST - Data types\nlet arr = [1, 2, 3];\n",
            "error_handling": "// CodeAps Starter Template: RUST - Error handling\nfn check() -> Result<(), ()> { Ok(()) }\n",
            "functions": "// CodeAps Starter Template: RUST - Functions\nfn boot() -> bool { true }\n",
            "input_output": "// CodeAps Starter Template: RUST - Input output\nprintln!('Output');\n",
            "loops": "// CodeAps Starter Template: RUST - Loops\nloop { break; }\n",
            "main_program_template": "// CodeAps Starter Template: RUST - Main program template\nfn main() { println!('Active'); }\n",
            "modules_or_imports": "// CodeAps Starter Template: RUST - Modules or imports\nuse std::io;\n",
            "object_oriented_programming": "// CodeAps Starter Template: RUST - Object oriented programming\nstruct Neural { id: u32 }\n",
            "starter_template": "// CodeAps Executive Starter: RUST\n\n// --- VARIABLES ---\nlet name = 'Neural';\nlet mut version = 1.0;\n\n// --- DATA_TYPES ---\nlet arr = [1, 2, 3];\n\n// --- INPUT_OUTPUT ---\nprintln!('Output');\n\n// --- CONDITIONAL_STATEMENTS ---\nif true { }\n\n// --- LOOPS ---\nloop { break; }\n\n// --- FUNCTIONS ---\nfn boot() -> bool { true }\n\n// --- OBJECT_ORIENTED_PROGRAMMING ---\nstruct Neural { id: u32 }\n\n// --- BASIC_DATA_STRUCTURES ---\nlet mut vec = Vec::new();\n\n// --- ERROR_HANDLING ---\nfn check() -> Result<(), ()> { Ok(()) }\n\n// --- MODULES_OR_IMPORTS ---\nuse std::io;\n\n// --- MAIN_PROGRAM_TEMPLATE ---\nfn main() { println!('Active'); }\n",
            "variables": "// CodeAps Starter Template: RUST - Variables\nlet name = 'Neural';\nlet mut version = 1.0;\n"
        }
    },
    "typescript": {
        "id": "typescript",
        "topics": {
            "basic_data_structures": "// CodeAps Starter Template: TYPESCRIPT - Basic data structures\nlet set = new Set<string>();\n",
            "conditional_statements": "// CodeAps Starter Template: TYPESCRIPT - Conditional statements\nif (true) { }\n",
            "data_types": "// CodeAps Starter Template: TYPESCRIPT - Data types\nlet arr: number[] = [1,2,3];\n",
            "error_handling": "// CodeAps Starter Template: TYPESCRIPT - Error handling\nthrow new Error('Signal Lost');\n",
            "functions": "// CodeAps Starter Template: TYPESCRIPT - Functions\nfunction boot(): boolean { return true; }\n",
            "input_output": "// CodeAps Starter Template: TYPESCRIPT - Input output\nconsole.log('TS Output');\n",
            "loops": "// CodeAps Starter Template: TYPESCRIPT - Loops\nwhile (true) { break; }\n",
            "main_program_template": "// CodeAps Starter Template: TYPESCRIPT - Main program template\nconsole.log('Neural Link Established');\n",
            "modules_or_imports": "// CodeAps Starter Template: TYPESCRIPT - Modules or imports\nexport const X = 1;\n",
            "object_oriented_programming": "// CodeAps Starter Template: TYPESCRIPT - Object oriented programming\ninterface Link { id: number; }\n",
            "starter_template": "// CodeAps Executive Starter: TYPESCRIPT\n\n// --- VARIABLES ---\nconst name: string = 'Neural';\n\n// --- DATA_TYPES ---\nlet arr: number[] = [1,2,3];\n\n// --- INPUT_OUTPUT ---\nconsole.log('TS Output');\n\n// --- CONDITIONAL_STATEMENTS ---\nif (true) { }\n\n// --- LOOPS ---\nwhile (true) { break; }\n\n// --- FUNCTIONS ---\nfunction boot(): boolean { return true; }\n\n// --- OBJECT_ORIENTED_PROGRAMMING ---\ninterface Link { id: number; }\n\n// --- BASIC_DATA_STRUCTURES ---\nlet set = new Set<string>();\n\n// --- ERROR_HANDLING ---\nthrow new Error('Signal Lost');\n\n// --- MODULES_OR_IMPORTS ---\nexport const X = 1;\n\n// --- MAIN_PROGRAM_TEMPLATE ---\nconsole.log('Neural Link Established');\n",
            "variables": "// CodeAps Starter Template: TYPESCRIPT - Variables\nconst name: string = 'Neural';\n"
        }
    }
};
