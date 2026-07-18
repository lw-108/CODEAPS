use serde::{Serialize, Deserialize};
use regex::Regex;

#[derive(Debug, Serialize, Deserialize)]
pub struct MemoryAllocation {
    pub line: usize,
    pub allocation_type: String,
    pub size_hint: usize,
}

#[tauri::command]
pub fn analyze_memory_rust(code: String) -> Vec<MemoryAllocation> {
    let mut allocations = Vec::new();
    
    // Industrial-grade heuristics for memory tracking
    let heap_patterns: [(Regex, &str, usize); 6] = [
        (Regex::new(r"Box::(new|pin)").unwrap(), "heap (Box)", 16),
        (Regex::new(r"Vec::(new|with_capacity|from)|vec!\[").unwrap(), "heap (Vec)", 32),
        (Regex::new(r"String::(from|new|with_capacity)|\.to_string\(\)|\.to_owned\(\)").unwrap(), "heap (String)", 24),
        (Regex::new(r"HashMap::new|BTreeMap::new|HashSet::new").unwrap(), "heap (Map/Set)", 48),
        (Regex::new(r"(Arc|Rc|RefCell)::new").unwrap(), "heap (SmartPtr)", 16),
        (Regex::new(r"VecDeque::new|LinkedList::new").unwrap(), "heap (Collection)", 32),
    ];

    let stack_patterns: [(Regex, &str, usize); 4] = [
        (Regex::new(r"let [a-zA-Z0-9_]+: \[.*;.*\]").unwrap(), "stack (Array)", 64),
        (Regex::new(r"let [a-zA-Z0-9_]+ = [0-9]+;").unwrap(), "stack (Primitive)", 8),
        (Regex::new(r"let [a-zA-Z0-9_]+ = (true|false);").unwrap(), "stack (Bool)", 1),
        (Regex::new(r"let [a-zA-Z0-9_]+ = [a-zA-Z0-9_]+ \{").unwrap(), "stack (Struct)", 32),
    ];

    for (i, line) in code.lines().enumerate() {
        let trimmed = line.trim();
        if trimmed.starts_with("//") || trimmed.is_empty() {
            continue;
        }

        // Heuristic: Check for potential heap-heavy library usage
        for (re, name, size) in &heap_patterns {
            if re.is_match(line) {
                allocations.push(MemoryAllocation {
                    line: i + 1,
                    allocation_type: name.to_string(),
                    size_hint: *size,
                });
            }
        }
        for (re, name, size) in &stack_patterns {
            if re.is_match(line) {
                allocations.push(MemoryAllocation {
                    line: i + 1,
                    allocation_type: name.to_string(),
                    size_hint: *size,
                });
            }
        }
    }

    // De-duplicate if multiple patterns match same line
    allocations.sort_by_key(|a| a.line);
    allocations.dedup_by(|a, b| a.line == b.line && a.allocation_type == b.allocation_type);

    allocations
}
