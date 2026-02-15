#!/usr/bin/env node
/**
 * M77 Audit: Import Graph Builder (Regex-based, no TS compiler dependency)
 * Outputs: import-graph.edges.jsonl + reachability.classification.jsonl
 */

import * as fs from 'fs';
import * as path from 'path';

const SRC_ROOT = path.join(process.cwd(), 'src/docudent');
const EDGES_OUTPUT = path.join(process.cwd(), 'docs/audit/m77/import-graph.edges.jsonl');
const CLASSIFICATION_OUTPUT = path.join(process.cwd(), 'docs/audit/m77/reachability.classification.jsonl');

interface ImportEdge {
    from: string;
    to: string;
    kind: 'import' | 'dynamic' | 'json' | 'type' | 'export';
    evidence: string;
}

interface FileClassification {
    path: string;
    classification: 'RUNTIME_REACHED' | 'TEST_ONLY' | 'DATA_ASSET' | 'LEGACY' | 'DEAD' | 'UNKNOWN';
    reached_from: string[];
    evidence: string;
}

const ENTRY_POINTS = [
    'src/docudent/v10/pages/DocudentV10Page.tsx',
    'src/docudent/v7/pages/DocudentV7Page.tsx',
    'src/docudent/v8/pages/DocudentV8Page.tsx',
    'src/docudent/v7/app/V7Router.tsx',
    'src/docudent/v8/app/V8Router.tsx',
];

function getAllTsFiles(dir: string, files: string[] = []): string[] {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            if (entry.name !== 'node_modules') {
                getAllTsFiles(fullPath, files);
            }
        } else if (entry.isFile()) {
            if (/\.(ts|tsx)$/.test(entry.name)) {
                files.push(path.relative(process.cwd(), fullPath));
            }
        }
    }

    return files;
}

function extractImportsRegex(content: string, filePath: string): ImportEdge[] {
    const edges: ImportEdge[] = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineNum = i + 1;

        // Static imports: import ... from '...'
        const staticMatch = line.match(/import\s+(?:type\s+)?(?:{[^}]*}|\*\s+as\s+\w+|\w+)?\s*(?:,\s*(?:{[^}]*}|\w+))?\s*from\s+['"]([^'"]+)['"]/);
        if (staticMatch) {
            const importPath = staticMatch[1];
            let kind: ImportEdge['kind'] = 'import';
            if (line.includes('import type')) kind = 'type';
            if (importPath.endsWith('.json')) kind = 'json';

            edges.push({
                from: filePath,
                to: importPath,
                kind,
                evidence: `${filePath}:${lineNum}`,
            });
        }

        // Dynamic imports: import('...')
        const dynamicMatch = line.match(/import\s*\(\s*['"]([^'"]+)['"]\s*\)/);
        if (dynamicMatch) {
            edges.push({
                from: filePath,
                to: dynamicMatch[1],
                kind: 'dynamic',
                evidence: `${filePath}:${lineNum}`,
            });
        }

        // Export from: export ... from '...'
        const exportMatch = line.match(/export\s+(?:\*|\{[^}]*\})\s+from\s+['"]([^'"]+)['"]/);
        if (exportMatch) {
            edges.push({
                from: filePath,
                to: exportMatch[1],
                kind: 'export',
                evidence: `${filePath}:${lineNum}`,
            });
        }
    }

    return edges;
}

function resolveImportPath(fromFile: string, importPath: string): string | null {
    if (!importPath.startsWith('.') && !importPath.startsWith('@/')) {
        return null; // External module
    }

    const fromDir = path.dirname(fromFile);
    let resolved = path.join(fromDir, importPath);

    const extensions = ['', '.ts', '.tsx', '/index.ts', '/index.tsx', '.json'];
    for (const ext of extensions) {
        const tryPath = resolved + ext;
        if (fs.existsSync(tryPath)) {
            return path.relative(process.cwd(), tryPath);
        }
    }

    return null;
}

function buildReachability(allFiles: string[], edges: ImportEdge[]): FileClassification[] {
    const graph = new Map<string, Set<string>>();
    const reverseGraph = new Map<string, Set<string>>();

    for (const file of allFiles) {
        graph.set(file, new Set());
        reverseGraph.set(file, new Set());
    }

    for (const edge of edges) {
        const resolved = resolveImportPath(edge.from, edge.to);
        if (resolved && allFiles.includes(resolved)) {
            graph.get(edge.from)?.add(resolved);
            reverseGraph.get(resolved)?.add(edge.from);
        }
    }

    // BFS from entry points
    const runtimeReached = new Set<string>();
    const reachedFrom = new Map<string, string[]>();

    for (const entry of ENTRY_POINTS) {
        if (!allFiles.includes(entry)) continue;

        const queue = [entry];
        const visited = new Set<string>();

        while (queue.length > 0) {
            const current = queue.shift()!;
            if (visited.has(current)) continue;
            visited.add(current);

            runtimeReached.add(current);
            if (!reachedFrom.has(current)) {
                reachedFrom.set(current, []);
            }
            reachedFrom.get(current)!.push(entry);

            for (const dep of graph.get(current) || []) {
                if (!visited.has(dep)) queue.push(dep);
            }
        }
    }

    // Classify
    const classifications: FileClassification[] = [];

    for (const file of allFiles) {
        let classification: FileClassification['classification'];
        let evidence: string;

        if (file.includes('__tests__') || file.includes('.test.') || file.includes('.spec.')) {
            classification = 'TEST_ONLY';
            evidence = 'Test file pattern';
        } else if (file.includes('/v6/') || file.includes('__archive__')) {
            classification = 'LEGACY';
            evidence = 'Legacy directory';
        } else if (runtimeReached.has(file)) {
            classification = 'RUNTIME_REACHED';
            evidence = `Entry: ${reachedFrom.get(file)?.join(', ')}`;
        } else {
            const importers = [...(reverseGraph.get(file) || [])].filter(f => runtimeReached.has(f));
            if (importers.length > 0) {
                classification = 'RUNTIME_REACHED';
                evidence = `Imported by: ${importers[0]}`;
                runtimeReached.add(file);
            } else {
                classification = 'UNKNOWN';
                evidence = 'No runtime path';
            }
        }

        classifications.push({
            path: file,
            classification,
            reached_from: reachedFrom.get(file) || [],
            evidence,
        });
    }

    return classifications;
}

function main() {
    console.log('[import-graph] Collecting files...');
    const allFiles = getAllTsFiles(SRC_ROOT);
    console.log(`[import-graph] Found ${allFiles.length} TS/TSX files`);

    const allEdges: ImportEdge[] = [];

    for (const file of allFiles) {
        try {
            const content = fs.readFileSync(file, 'utf-8');
            const edges = extractImportsRegex(content, file);
            allEdges.push(...edges);
        } catch (e) {
            console.warn(`[import-graph] Failed: ${file}`);
        }
    }

    console.log(`[import-graph] Extracted ${allEdges.length} edges`);

    fs.writeFileSync(EDGES_OUTPUT, allEdges.map(e => JSON.stringify(e)).join('\n') + '\n');
    console.log(`[import-graph] Edges → ${EDGES_OUTPUT}`);

    const classifications = buildReachability(allFiles, allEdges);
    fs.writeFileSync(CLASSIFICATION_OUTPUT, classifications.map(c => JSON.stringify(c)).join('\n') + '\n');
    console.log(`[import-graph] Classifications → ${CLASSIFICATION_OUTPUT}`);

    const stats = { total: allFiles.length, edges: allEdges.length, by_class: {} as Record<string, number> };
    for (const c of classifications) {
        stats.by_class[c.classification] = (stats.by_class[c.classification] || 0) + 1;
    }
    console.log('[import-graph] Stats:', JSON.stringify(stats, null, 2));
}

main();
