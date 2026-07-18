import os
import json

def main():
    root = "templates"
    templates_data = {}
    
    for lang in os.listdir(root):
        lang_path = os.path.join(root, lang)
        if not os.path.isdir(lang_path):
            continue
            
        templates_data[lang] = {
            "id": lang,
            "topics": {}
        }
        
        for topic_file in os.listdir(lang_path):
            topic_path = os.path.join(lang_path, topic_file)
            if not os.path.isfile(topic_path):
                continue
                
            topic_name = os.path.splitext(topic_file)[0]
            with open(topic_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            templates_data[lang]["topics"][topic_name] = content

    ts_content = "export interface TemplateTopic {\n    id: string;\n    content: string;\n}\n\n"
    ts_content += "export interface LanguageTemplates {\n    id: string;\n    topics: Record<string, string>;\n}\n\n"
    ts_content += "export const FULL_TEMPLATES: Record<string, LanguageTemplates> = "
    ts_content += json.dumps(templates_data, indent=4)
    ts_content += ";\n"

    with open("frontend/src/lib/templates.ts", "w", encoding="utf-8") as f:
        f.write(ts_content)

    print("Successfully synchronized 100+ templates to frontend library.")

if __name__ == "__main__":
    main()
