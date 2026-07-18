export class FileExplorer {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.rootPath = 'src';
        this.expandedFolders = new Set(['backend-python', 'ai_engine']);
        this.files = [
            {
                name: 'backend-python', is_dir: true, children: [
                    { name: 'main.py', is_dir: false },
                    { name: 'requirements.txt', is_dir: false },
                    {
                        name: 'app', is_dir: true, children: [
                            { name: 'api', is_dir: true, children: [] },
                            { name: 'core', is_dir: true, children: [] }
                        ]
                    }
                ]
            },
            {
                name: 'ai_engine', is_dir: true, children: [
                    { name: 'model_manager.py', is_dir: false },
                    { name: 'cache.py', is_dir: false }
                ]
            },
            { name: 'package.json', is_dir: false },
            { name: 'README.md', is_dir: false }
        ];
        this.render();
        this.initContextMenu();
    }

    render() {
        this.container.innerHTML = '';
        const wrapper = document.createElement('div');
        wrapper.className = 'explorer-tree-wrapper';

        this.files.forEach(file => {
            wrapper.appendChild(this.createFileElement(file));
        });

        this.container.appendChild(wrapper);
    }

    createFileElement(file, depth = 0) {
        const itemContainer = document.createElement('div');
        itemContainer.className = 'file-tree-node';

        const row = document.createElement('div');
        row.className = `file-item ${file.is_dir ? 'directory' : 'file'}`;
        if (this.expandedFolders.has(file.name) && file.is_dir) row.classList.add('expanded');

        row.style.paddingLeft = `${depth * 12}px`; // Indent based on depth

        const chevron = file.is_dir
            ? `<i class="fa-solid fa-chevron-right chevron-icon"></i>`
            : '<span style="width:12px"></span>';

        const icon = file.is_dir
            ? `<i class="fa-solid fa-folder${this.expandedFolders.has(file.name) ? '-open' : ''} folder-icon"></i>`
            : this.getFileIcon(file.name);

        const statusDot = !file.is_dir && Math.random() > 0.7 
            ? `<span class="status-indicator-dot ${Math.random() > 0.5 ? 'modified' : 'new'}"></span>`
            : '';

        row.innerHTML = `
            ${chevron}
            <span class="tree-icon-wrapper">${icon}</span>
            <span class="file-label">${file.name}</span>
            ${statusDot}
        `;

        row.onclick = (e) => {
            e.stopPropagation();
            if (file.is_dir) {
                this.toggleFolder(file.name, row);
            } else {
                this.openFile(file.name);
            }
        };

        row.oncontextmenu = (e) => {
            e.preventDefault();
            this.showContextMenu(e.pageX, e.pageY, file);
        };

        itemContainer.appendChild(row);

        if (file.is_dir && file.children && this.expandedFolders.has(file.name)) {
            const childrenWrapper = document.createElement('div');
            childrenWrapper.className = 'children-wrapper';
            file.children.forEach(child => {
                childrenWrapper.appendChild(this.createFileElement(child, depth + 1));
            });
            itemContainer.appendChild(childrenWrapper);
        }

        return itemContainer;
    }

    initContextMenu() {
        let menu = document.getElementById('explorer-context-menu');
        if (!menu) {
            menu = document.createElement('div');
            menu.id = 'explorer-context-menu';
            menu.className = 'context-menu-premium';
            document.body.appendChild(menu);
        }

        document.addEventListener('click', () => {
            menu.style.display = 'none';
        });
    }

    showContextMenu(x, y, file) {
        const menu = document.getElementById('explorer-context-menu');
        menu.innerHTML = `
            <div class="menu-item" id="ctx-new-file"><i class="fa-solid fa-file-circle-plus"></i> New File</div>
            <div class="menu-item" id="ctx-new-folder"><i class="fa-solid fa-folder-plus"></i> New Folder</div>
            <div class="menu-divider"></div>
            <div class="menu-item danger" id="ctx-delete"><i class="fa-solid fa-trash"></i> Delete</div>
            <div class="menu-item" id="ctx-rename"><i class="fa-solid fa-pen"></i> Rename</div>
        `;
        menu.style.left = `${x}px`;
        menu.style.top = `${y}px`;
        menu.style.display = 'block';

        document.getElementById('ctx-new-file').onclick = () => this.handleNewFile(file);
        document.getElementById('ctx-delete').onclick = () => this.handleDelete(file);
    }

    handleNewFile(parent) {
        const name = prompt('Enter filename:');
        if (name) {
            console.log(`[FileExplorer] Creating file ${name} in ${parent.name}`);
            // Mock update
            if (parent.is_dir) {
                parent.children.push({ name, is_dir: false });
                this.render();
            }
        }
    }

    handleDelete(file) {
        if (confirm(`Are you sure you want to delete ${file.name}?`)) {
            console.log(`[FileExplorer] Deleting ${file.name}`);
            // In a real app, we'd find the parent and splice the children
            this.render();
        }
    }

    toggleFolder(name, element) {
        if (this.expandedFolders.has(name)) {
            this.expandedFolders.delete(name);
        } else {
            this.expandedFolders.add(name);
        }
        this.render();
    }

    openFile(name) {
        if (window.ide && window.ide.editorArea) {
            window.ide.editorArea.openTab(name, `# Dynamic content for ${name}`);
        }
    }

    getFileIcon(filename) {
        if (filename.endsWith('.c')) return '<img src="https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/C_Programming_Language.svg/1920px-C_Programming_Language.svg.png" style="width:1.2em;height:1.2em;object-contain" />';
        if (filename.endsWith('.cpp')) return '<img src="https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/ISO_C%2B%2B_Logo.svg/1280px-ISO_C%2B%2B_Logo.svg.png" style="width:1.2em;height:1.2em;object-contain" />';
        if (filename.endsWith('.py')) return '<img src="https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Python-logo-notext.svg/1280px-Python-logo-notext.svg.png" style="width:1.2em;height:1.2em;object-contain" />';
        if (filename.endsWith('.js')) return '<img src="https://www.svgrepo.com/show/373762/light-js.svg" style="width:1.2em;height:1.2em;object-contain" />';
        if (filename.endsWith('.ts')) return '<img src="https://www.svgrepo.com/show/374144/typescript.svg" style="width:1.2em;height:1.2em;object-contain" />';
        if (filename.endsWith('.rs')) return '<img src="https://icons.veryicon.com/png/o/business/vscode-program-item-icon/rust-1.png" style="width:1.2em;height:1.2em;object-contain" />';
        if (filename.endsWith('.md')) return '<img src="https://upload.wikimedia.org/wikipedia/commons/4/48/Markdown-mark.svg" style="width:1.2em;height:1.2em;object-contain" />';
        if (filename.endsWith('.html')) return '<img src="https://upload.wikimedia.org/wikipedia/commons/6/61/HTML5_logo_and_wordmark.svg" style="width:1.2em;height:1.2em;object-contain" />';
        return '<i class="fa-regular fa-file"></i>';
    }
}
