const fs = require('fs-extra');
const JavaScriptObfuscator = require('javascript-obfuscator');
const minifyHTML = require('html-minifier-terser').minify;
const CleanCSS = require('clean-css');
const path = require('path');

// Configuração: Onde os arquivos "compilados" vão ficar
const DIST_DIR = './dist';

async function build() {
    console.log('--- Iniciando Processo de Build (Ofuscação) ---');

    // 1. Limpa a pasta dist antiga (como um "clean" no makefile)
    await fs.emptyDir(DIST_DIR);
    console.log('[1/4] Pasta dist limpa.');

    // 2. Lista todos os arquivos da raiz
    const files = fs.readdirSync('./');

    for (const file of files) {
        // Ignora arquivos de sistema, node_modules e a própria pasta dist
        if (['node_modules', 'dist', '.git', '.vscode', 'package.json', 'package-lock.json', 'build.js', 'songs.rar', 'backup.txt', 'organizacao.txt'].includes(file)) {
            continue;
        }

        const srcPath = path.join('./', file);
        const destPath = path.join(DIST_DIR, file);
        const stats = fs.statSync(srcPath);

        // Se for pasta (ex: audios, imagens), copia direto
        if (stats.isDirectory()) {
            await fs.copy(srcPath, destPath);
            console.log(` -> Pasta copiada: ${file}`);
            continue;
        }

        // 3. Processamento por tipo de arquivo
        const extension = path.extname(file);
        const content = fs.readFileSync(srcPath, 'utf8');

        try {
            if (extension === '.js') {
                // --- OFUSCAÇÃO DE JAVASCRIPT ---
                console.log(` -> Ofuscando JS: ${file}`);
                
                // Configuração pesada para proteger o código
                const obfuscationResult = JavaScriptObfuscator.obfuscate(content, {
                    compact: true,
                    controlFlowFlattening: true, // Muda a estrutura lógica (if/else vira switch case maluco)
                    deadCodeInjection: true,     // Insere código lixo para confundir
                    debugProtection: true,       // Tenta impedir o uso do console do navegador
                    disableConsoleOutput: true,  // Remove seus console.log
                    selfDefending: true,         // O código quebra se tentarem formatar
                    stringArray: true,           // Encripta strings
                    splitStrings: true,
                    renameGlobals: false         // CUIDADO: Deixe false para não quebrar Firebase/PWA
                });
                
                fs.writeFileSync(destPath, obfuscationResult.getObfuscatedCode());

            } else if (extension === '.html') {
                // --- MINIFICAÇÃO DE HTML ---
                console.log(` -> Minificando HTML: ${file}`);
                const minifiedHtml = await minifyHTML(content, {
                    removeAttributeQuotes: true,
                    collapseWhitespace: true,
                    removeComments: true,
                    minifyCSS: true, // Minifica CSS que estiver dentro do HTML
                    minifyJS: true   // Minifica JS que estiver dentro do HTML
                });
                fs.writeFileSync(destPath, minifiedHtml);

            } else if (extension === '.css') {
                // --- MINIFICAÇÃO DE CSS ---
                console.log(` -> Minificando CSS: ${file}`);
                const minifiedCss = new CleanCSS().minify(content);
                fs.writeFileSync(destPath, minifiedCss.styles);

            } else {
                // Arquivos json, ico, png, etc -> Apenas copia
                console.log(` -> Copiando arquivo estático: ${file}`);
                await fs.copy(srcPath, destPath);
            }
        } catch (err) {
            console.error(`ERRO ao processar ${file}:`, err);
        }
    }

    console.log('--- BUILD CONCLUÍDO COM SUCESSO! ---');
    console.log('Seus arquivos protegidos estão na pasta: /dist');
}

build();