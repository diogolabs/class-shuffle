let estadoAtual = {
    disciplina: '', alunos: [], numSalas: 2, numFileiras: 5, numCarteiras: 6,
    agrupamento: 'solo', tamanhoGrupo: 3, regraTurma: 'nenhuma',
    alunosEspeciais: [], incompativeis: [], inseparaveis: [], proximoProfessor: false, mesmaFileira: false, resultado: null
};

// --- SISTEMA DE AUTOCOMPLETAR (CHIPS) ---
function setupAutocomplete(textareaId, dropdownId, separador) {
    const textarea = document.getElementById(textareaId);
    const dropdown = document.getElementById(dropdownId);
    if(!textarea || !dropdown) return;

    textarea.addEventListener('input', function() {
        const cursorPosition = textarea.selectionStart;
        const textToCursor = textarea.value.substring(0, cursorPosition);
        
        let partes = separador === ',' ? textToCursor.split(/[\n,]/) : textToCursor.split('\n');
        const currentTerm = partes[partes.length - 1].trim().toLowerCase();
        
        if (currentTerm.length < 2) {
            dropdown.classList.add('hidden');
            return;
        }

        const rawAlunos = document.getElementById('alunos').value.split('\n');
        const nomesDisponiveis = rawAlunos.map(a => {
            let texto = a.trim();
            const sep = texto.match(/(\s+-\s*|\s*-\s+|[–—,/;|])/);
            if (sep) return texto.split(sep[0])[0].trim();
            return texto;
        }).filter(n => n.length > 0);

        const matches = nomesDisponiveis.filter(n => n.toLowerCase().includes(currentTerm) && n.toLowerCase() !== currentTerm);

        if (matches.length > 0) {
            dropdown.innerHTML = matches.map(m => 
                `<div class="p-2 hover:bg-gray-200 cursor-pointer text-sm border-b border-gray-200 font-label-mono" onclick="selectAutocomplete('${textareaId}', '${dropdownId}', '${m.replace(/'/g, "\\'")}', '${separador}')">${m}</div>`
            ).join('');
            dropdown.classList.remove('hidden');
        } else {
            dropdown.classList.add('hidden');
        }
    });

    document.addEventListener('click', function(e) {
        if (e.target !== textarea && e.target.parentNode !== dropdown) {
            dropdown.classList.add('hidden');
        }
    });
}

window.selectAutocomplete = function(textareaId, dropdownId, selectedName, separador) {
    const textarea = document.getElementById(textareaId);
    const dropdown = document.getElementById(dropdownId);
    
    const text = textarea.value;
    const cursorPosition = textarea.selectionStart;
    const textToCursor = text.substring(0, cursorPosition);
    const textAfterCursor = text.substring(cursorPosition);
    
    let lastIndex = separador === ',' ? Math.max(textToCursor.lastIndexOf('\n'), textToCursor.lastIndexOf(',')) : textToCursor.lastIndexOf('\n');
    const newTextBefore = textToCursor.substring(0, lastIndex + 1);
    const prefix = (separador === ',' && lastIndex !== -1 && textToCursor[lastIndex] === ',') ? ' ' : '';
    
    textarea.value = newTextBefore + prefix + selectedName + (separador === ',' ? ', ' : '\n') + textAfterCursor;
    dropdown.classList.add('hidden');
    textarea.focus();
};

setupAutocomplete('alunosEspeciais', 'dropEspeciais', '\n');
setupAutocomplete('alunosIncompativeis', 'dropIncomp', '\n');
setupAutocomplete('alunosInseparaveis', 'dropInseparaveis', ',');

// --- MOTOR DE MAPEAMENTO ---
function embaralhar() {
    const erro = validarEntrada();
    if (erro) return mostrarErro(erro);
    
    limparErro();
    coletarDados();
    
    const resultado = processarEmbaralhamento();
    estadoAtual.resultado = resultado;
    
    exibirResultados(resultado);
    
    const formSec = document.getElementById('formSection');
    const resSec = document.getElementById('resultSection');
    
    if (formSec) formSec.style.display = 'none';
    if (resSec) {
        resSec.classList.remove('hidden');
        resSec.style.display = 'flex';
    }
}

function validarEntrada() {
    const discEl = document.getElementById('disciplina');
    const alunosEl = document.getElementById('alunos');
    if (!discEl || !alunosEl) return '❌ Erro de interface: Recarregue a página.';
    if (!discEl.value.trim()) return '❌ Por favor, preencha a disciplina';
    if (!alunosEl.value.trim()) return '❌ Por favor, adicione pelo menos um aluno';

    const numAlunos = alunosEl.value.trim().split('\n').filter(a => a.trim()).length;
    const numSalas = parseInt(document.getElementById('numSalas')?.value) || 1;
    const numFileiras = parseInt(document.getElementById('numFileiras')?.value) || 1;
    const numCarteiras = parseInt(document.getElementById('numCarteiras')?.value) || 1;
    
    let multiplicador = 1;
    const agrupamento = document.getElementById('agrupamento')?.value || 'solo';
    if (agrupamento === 'dupla') multiplicador = 2;
    if (agrupamento === 'grupo') multiplicador = parseInt(document.getElementById('tamanhoGrupo')?.value) || 3;

    const capacidadeTotal = numSalas * numFileiras * numCarteiras * multiplicador;
    if (numAlunos > capacidadeTotal) {
        return `❌ Não há espaço! Você tem ${numAlunos} alunos, mas apenas ${capacidadeTotal} vagas na configuração atual.`;
    }
    return null;
}

function coletarDados() {
    estadoAtual.disciplina = document.getElementById('disciplina')?.value.trim() || '';
    
    const alunosRaw = document.getElementById('alunos')?.value.trim() || '';
    estadoAtual.alunos = alunosRaw.split('\n').filter(a => a.trim()).map(a => {
        let texto = a.trim();
        let nome = texto;
        let turma = 'Geral';
        const separador = texto.match(/(\s+-\s*|\s*-\s+|[–—,/;|])/);
        if (separador) {
            const partes = texto.split(separador[0]);
            turma = partes.pop().trim();
            nome = partes.join(separador[0]).trim();
        }
        return { nome, turma, original: texto };
    });

    estadoAtual.numSalas = parseInt(document.getElementById('numSalas')?.value) || 2;
    estadoAtual.numFileiras = parseInt(document.getElementById('numFileiras')?.value) || 5;
    estadoAtual.numCarteiras = parseInt(document.getElementById('numCarteiras')?.value) || 6;
    estadoAtual.agrupamento = document.getElementById('agrupamento')?.value || 'solo';
    estadoAtual.tamanhoGrupo = parseInt(document.getElementById('tamanhoGrupo')?.value) || 3;
    estadoAtual.regraTurma = document.getElementById('regraTurma')?.value || 'nenhuma';
    
    estadoAtual.alunosEspeciais = (document.getElementById('alunosEspeciais')?.value || '').split('\n').filter(a => a.trim()).map(a => a.trim().toLowerCase());
    estadoAtual.incompativeis = (document.getElementById('alunosIncompativeis')?.value || '').split('\n').filter(a => a.trim()).map(a => a.trim().toLowerCase());
    
    const insepRaw = document.getElementById('alunosInseparaveis')?.value || '';
    estadoAtual.inseparaveis = insepRaw.split('\n').filter(l => l.trim()).map(l => l.split(',').map(n => n.trim().toLowerCase()).filter(n => n));
}

function processarEmbaralhamento() {
    const { alunos, numSalas, numFileiras, numCarteiras, agrupamento, tamanhoGrupo, alunosEspeciais, incompativeis, inseparaveis, regraTurma } = estadoAtual;
    let alunosEmbaralhados = [...alunos].sort(() => Math.random() - 0.5);

    if (regraTurma === 'agrupar') {
        alunosEmbaralhados.sort((a, b) => a.turma.localeCompare(b.turma));
    } else if (regraTurma === 'separar') {
        const turmasHash = {};
        alunosEmbaralhados.forEach(a => {
            if (!turmasHash[a.turma]) turmasHash[a.turma] = [];
            turmasHash[a.turma].push(a);
        });
        const chavesOrdenadas = Object.keys(turmasHash).sort((a, b) => turmasHash[b].length - turmasHash[a].length);
        const misturados = [];
        let temAluno = true;
        while(temAluno) {
            temAluno = false;
            for(let key of chavesOrdenadas) {
                if (turmasHash[key].length > 0) {
                    misturados.push(turmasHash[key].shift());
                    temAluno = true;
                }
            }
        }
        alunosEmbaralhados = misturados;
    }

    // 1. CHUNKING: Agrupar alunos Inseparáveis
    let chunks = [];
    let usedNames = new Set();
    
    if (agrupamento !== 'solo') {
        inseparaveis.forEach(nomes => {
            let chunk = [];
            nomes.forEach(nomeBusca => {
                let idx = alunosEmbaralhados.findIndex(a => !usedNames.has(a.nome) && (a.nome.toLowerCase().includes(nomeBusca) || a.original.toLowerCase().includes(nomeBusca)));
                if (idx !== -1) {
                    chunk.push(alunosEmbaralhados[idx]);
                    usedNames.add(alunosEmbaralhados[idx].nome);
                }
            });
            if (chunk.length > 0) chunks.push(chunk);
        });
    }
    
    alunosEmbaralhados.forEach(a => {
        if (!usedNames.has(a.nome)) chunks.push([a]);
    });

    // 2. Classificação: Especiais vs Normais (Se um for especial, o chunk todo vai pra frente)
    const isEspecial = (a) => alunosEspeciais.includes(a.nome.toLowerCase()) || alunosEspeciais.includes(a.original.toLowerCase());
    const isIncompativel = (a) => incompativeis.some(inc => a.nome.toLowerCase().includes(inc) || a.original.toLowerCase().includes(inc));
    
    let chunksEspeciais = chunks.filter(c => c.some(isEspecial));
    let chunksNormais = chunks.filter(c => !c.some(isEspecial));
    
    // 3. Espaçamento de Incompatíveis
    function mesclarEspacado(listaIncomp, listaResto) {
        if (listaIncomp.length === 0) return listaResto;
        if (listaResto.length === 0) return listaIncomp;
        const esp = Math.max(1, Math.floor(listaResto.length / listaIncomp.length));
        let resultado = [];
        let idx = 0;
        for (let i = 0; i < listaResto.length; i++) {
            if (i > 0 && i % esp === 0 && idx < listaIncomp.length) resultado.push(listaIncomp[idx++]);
            resultado.push(listaResto[i]);
        }
        while (idx < listaIncomp.length) resultado.push(listaIncomp[idx++]);
        return resultado;
    }
    
    let finalEspeciais = mesclarEspacado(chunksEspeciais.filter(c => c.some(isIncompativel)), chunksEspeciais.filter(c => !c.some(isIncompativel)));
    let finalNormais = mesclarEspacado(chunksNormais.filter(c => c.some(isIncompativel)), chunksNormais.filter(c => !c.some(isIncompativel)));

    // 4. Preenchimento Dinâmico
    const tamanho = agrupamento === 'solo' ? 1 : (agrupamento === 'dupla' ? 2 : tamanhoGrupo);
    const numGruposFrente = numSalas * numFileiras;
    let gruposFrente = Array.from({ length: numGruposFrente }, () => []);
    let gruposGerais = [];
    
    let indexFrente = 0;
    while(finalEspeciais.length > 0) {
        let chunk = finalEspeciais.shift();
        let found = false;
        for(let i = 0; i < numGruposFrente; i++) {
            let idx = (indexFrente + i) % numGruposFrente;
            if (gruposFrente[idx].length + chunk.length <= tamanho) {
                gruposFrente[idx] = gruposFrente[idx].concat(chunk);
                indexFrente = idx + 1;
                found = true; break;
            }
        }
        if(!found) finalNormais.unshift(chunk);
    }
    
    for(let i = 0; i < numGruposFrente; i++) {
        while(gruposFrente[i].length < tamanho && finalNormais.length > 0) {
            let chunk = finalNormais[0];
            if (gruposFrente[i].length + chunk.length <= tamanho) {
                gruposFrente[i] = gruposFrente[i].concat(finalNormais.shift());
            } else {
                let fitIdx = finalNormais.findIndex(c => gruposFrente[i].length + c.length <= tamanho);
                if (fitIdx !== -1) {
                    gruposFrente[i] = gruposFrente[i].concat(finalNormais.splice(fitIdx, 1)[0]);
                } else {
                    let space = tamanho - gruposFrente[i].length;
                    gruposFrente[i] = gruposFrente[i].concat(finalNormais[0].splice(0, space));
                    if (finalNormais[0].length === 0) finalNormais.shift();
                    break;
                }
            }
        }
        if (gruposFrente[i].length > 0) gruposGerais.push(gruposFrente[i]);
    }
    
    let currentDesk = [];
    while(finalNormais.length > 0) {
        let chunk = finalNormais[0];
        if (currentDesk.length + chunk.length <= tamanho) {
            currentDesk = currentDesk.concat(finalNormais.shift());
            if (currentDesk.length === tamanho) {
                gruposGerais.push(currentDesk);
                currentDesk = [];
            }
        } else {
            let fitIdx = finalNormais.findIndex(c => currentDesk.length + c.length <= tamanho);
            if (fitIdx !== -1) {
                currentDesk = currentDesk.concat(finalNormais.splice(fitIdx, 1)[0]);
                if (currentDesk.length === tamanho) {
                    gruposGerais.push(currentDesk);
                    currentDesk = [];
                }
            } else {
                let space = tamanho - currentDesk.length;
                currentDesk = currentDesk.concat(finalNormais[0].splice(0, space));
                if (finalNormais[0].length === 0) finalNormais.shift();
                gruposGerais.push(currentDesk);
                currentDesk = [];
            }
        }
    }
    if (currentDesk.length > 0) gruposGerais.push(currentDesk);
    
    const flatEspeciais = alunosEspeciais;
    const salas = distribuirEmSalas(gruposGerais, numSalas, numFileiras, numCarteiras, flatEspeciais);

    return {
        disciplina: estadoAtual.disciplina, data: new Date().toLocaleDateString('pt-BR'),
        totalAlunos: alunos.length, numSalas, numFileiras, numCarteiras, agrupamento, salas
    };
}

function distribuirEmSalas(grupos, numSalas, numFileiras, numCarteiras, especiais) {
    const salas = Array.from({ length: numSalas }, () => []);
    const assentosPorSala = Array(numSalas).fill(0);

    grupos.forEach((grupo, index) => {
        const salaAtual = index % numSalas;
        const assentoIndex = assentosPorSala[salaAtual];
        const fileira = assentoIndex % numFileiras; 
        const carteira = Math.floor(assentoIndex / numFileiras); 

        if (carteira < numCarteiras) { 
            const proximoProfessor = grupo.some(g => especiais.includes(g.nome.toLowerCase()) || especiais.includes(g.original.toLowerCase()));
            salas[salaAtual].push({ fileira, carteira, grupo, proximoProfessor });
            assentosPorSala[salaAtual]++;
        }
    });
    return salas;
}

function exibirResultados(resultado) {
    const statsHtml = `
        <div class="bg-white p-4 rounded-lg border border-gray-200 flex flex-col items-center justify-center shadow-sm">
            <span class="text-gray-500 text-xs font-label-mono mb-1">TOTAL ALUNOS</span>
            <span class="font-headline-lg text-black">${resultado.totalAlunos}</span>
        </div>
        <div class="bg-white p-4 rounded-lg border border-gray-200 flex flex-col items-center justify-center shadow-sm">
            <span class="text-gray-500 text-xs font-label-mono mb-1">SALAS USADAS</span>
            <span class="font-headline-lg text-black">${resultado.numSalas}</span>
        </div>
        <div class="bg-white p-4 rounded-lg border border-gray-200 flex flex-col items-center justify-center shadow-sm">
            <span class="text-gray-500 text-xs font-label-mono mb-1">VAGAS TOTAIS</span>
            <span class="font-headline-lg text-blue-600">${resultado.numSalas * resultado.numFileiras * resultado.numCarteiras}</span>
        </div>
    `;
    document.getElementById('stats').innerHTML = statsHtml;
    
    desenharMapa(resultado);
    gerarListaDetalhada(resultado);
    
    const sucEl = document.getElementById('successMessage');
    sucEl.innerHTML = `<span class="material-symbols-outlined align-middle mr-2">check_circle</span> Mapeamento concluído! ${resultado.data}`;
    sucEl.classList.remove('hidden');
}

function desenharMapa(resultado) {
    const mapaContainer = document.getElementById('mapa');
    mapaContainer.innerHTML = ''; 
    
    const SALA_LARGURA = 420; const SALA_ALTURA = 350; const MARGEM = 20;

    resultado.salas.forEach((sala, indSala) => {
        const roomCard = document.createElement('div');
        roomCard.className = 'bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col items-center gap-4';

        const canvas = document.createElement('canvas');
        canvas.width = SALA_LARGURA + (MARGEM * 2);
        canvas.height = SALA_ALTURA + (MARGEM * 2);
        canvas.className = 'rounded border border-gray-100';
        
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        desenharSala(ctx, MARGEM, MARGEM, SALA_LARGURA, SALA_ALTURA, sala, indSala + 1, resultado);

        const btnExportar = document.createElement('button');
        btnExportar.className = 'w-full py-2 rounded font-label-mono flex items-center justify-center gap-2 border border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-700 transition-colors text-sm';
        btnExportar.innerHTML = `<span class="material-symbols-outlined text-[18px]">image</span> EXPORTAR SALA ${indSala + 1}`;
        
        btnExportar.onclick = () => {
            const a = document.createElement('a');
            a.href = canvas.toDataURL('image/png');
            a.download = `SALA-${indSala + 1}-${estadoAtual.disciplina || 'mapeamento'}.png`;
            document.body.appendChild(a); 
            a.click();
            document.body.removeChild(a);
        };

        roomCard.appendChild(canvas);
        roomCard.appendChild(btnExportar);
        mapaContainer.appendChild(roomCard);
    });
}

function desenharSala(ctx, x, y, largura, altura, carteirasOcupadas, numSala, resultado) {
    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#9ca3af'; ctx.lineWidth = 2;
    ctx.fillRect(x, y, largura, altura); ctx.strokeRect(x, y, largura, altura);
    
    ctx.fillStyle = '#111827'; ctx.font = 'bold 16px Courier Prime, monospace'; ctx.textAlign = 'left';
    ctx.fillText(`SALA ${numSala}`, x + 15, y + 25);
    
    ctx.fillStyle = '#e5e7eb'; ctx.fillRect(x + largura / 2 - 60, y + 10, 120, 15);
    ctx.fillStyle = '#374151'; ctx.font = '10px Courier Prime, monospace'; ctx.textAlign = 'center';
    ctx.fillText('LOUSA', x + largura / 2, y + 21);
    
    ctx.fillStyle = '#fef08a'; ctx.fillRect(x + 15, y + 45, 45, 25);
    ctx.fillStyle = '#854d0e'; ctx.font = 'bold 11px Courier Prime, monospace'; ctx.fillText('Prof.', x + 37, y + 62);

    const espacoX = (largura - 30) / resultado.numFileiras; 
    const espacoY = (altura - 90) / resultado.numCarteiras; 
    const deskW = Math.min(espacoX * 0.85, 80); 
    const deskH = Math.min(espacoY * 0.85, 45);

    for (let linha = 0; linha < resultado.numCarteiras; linha++) {
        for (let coluna = 0; coluna < resultado.numFileiras; coluna++) {
            const px = x + 15 + coluna * espacoX + (espacoX - deskW) / 2;
            const py = y + 80 + linha * espacoY + (espacoY - deskH) / 2;
            const carteiraAtual = carteirasOcupadas.find(c => c.fileira === coluna && c.carteira === linha);

            ctx.beginPath();
            if (ctx.roundRect) ctx.roundRect(px, py, deskW, deskH, 4);
            else ctx.rect(px, py, deskW, deskH);

            if (carteiraAtual) {
                ctx.fillStyle = carteiraAtual.proximoProfessor ? '#fef3c7' : '#e0e7ff'; 
                ctx.strokeStyle = carteiraAtual.proximoProfessor ? '#f59e0b' : '#3b82f6';
                ctx.lineWidth = carteiraAtual.proximoProfessor ? 2 : 1;
                ctx.fill(); ctx.stroke();
                
                ctx.fillStyle = '#111827'; ctx.font = 'bold 10px Courier Prime, monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                const stepY = 12;
                let startY = py + deskH / 2 - ((carteiraAtual.grupo.length - 1) * stepY) / 2;
                carteiraAtual.grupo.forEach(a => {
                    const parts = a.nome.split(' ');
                    ctx.fillText(parts[0] + (parts.length > 1 ? ' ' + parts[parts.length-1].charAt(0) + '.' : ''), px + deskW / 2, startY);
                    startY += stepY;
                });
            } else {
                ctx.fillStyle = '#f9fafb'; ctx.strokeStyle = '#d1d5db'; ctx.lineWidth = 1;
                ctx.fill(); ctx.stroke();
            }
        }
    }
}

function gerarListaDetalhada(resultado) {
    let html = '';
    resultado.salas.forEach((sala, indSala) => {
        html += `<div class="room-list mb-6"><div class="font-headline-lg-mobile text-black mb-3 border-b border-gray-200 pb-2">SALA ${indSala + 1}</div>`;
        sala.forEach((carteira, idx) => {
            const nomes = carteira.grupo.map(a => `<strong class="text-black">${a.nome}</strong> <span class="text-gray-500 text-xs">(${a.turma})</span>`).join(' + ');
            const proximoClass = carteira.proximoProfessor ? 'border-l-4 border-amber-500 bg-amber-50' : 'border border-gray-300 bg-white';
            html += `<div class="p-3 mb-2 rounded flex items-center gap-4 ${proximoClass}">
                <div class="bg-gray-200 text-gray-800 px-3 py-1 rounded text-sm font-label-mono font-bold">${idx + 1}</div>
                <div class="flex-1 font-body-md text-gray-900">${nomes}</div>
                ${carteira.proximoProfessor ? '<div class="text-xs font-label-mono text-amber-700 uppercase tracking-widest font-bold">Frente</div>' : ''}
            </div>`;
        });
        html += '</div>';
    });
    document.getElementById('listContainer').innerHTML = html;
}

function mudarAba(abaNome, event) {
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('bg-white', 'text-black', 'shadow-sm', 'active');
        btn.classList.add('text-gray-600');
    });
    document.querySelectorAll('.tab-content').forEach(c => { c.classList.add('hidden'); c.classList.remove('active'); });
    if(event) {
        event.target.classList.add('bg-white', 'text-black', 'shadow-sm', 'active');
        event.target.classList.remove('text-gray-600');
    }
    const abaEl = document.getElementById(abaNome);
    if (abaEl) { abaEl.classList.remove('hidden'); abaEl.classList.add('active'); }
}

function imprimirResultado() { window.print(); }
function voltarFormulario() {
    document.getElementById('resultSection').classList.add('hidden');
    document.getElementById('resultSection').style.display = 'none';
    document.getElementById('formSection').style.display = 'flex';
}
function limparFormulario() {
    ['disciplina', 'alunos', 'alunosEspeciais', 'alunosIncompativeis', 'alunosInseparaveis'].forEach(id => document.getElementById(id).value = '');
    limparErro();
}
function mostrarErro(m) {
    const e = document.getElementById('errorMessage');
    e.textContent = m; e.classList.remove('hidden');
}
function limparErro() { document.getElementById('errorMessage').classList.add('hidden'); }

function exportarJSON() {
    if (!estadoAtual.resultado) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(estadoAtual.resultado, null, 2)], { type: 'application/json' }));
    a.download = `mapeamento-${estadoAtual.disciplina}-${new Date().getTime()}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
}

function processarCSV(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        const linhas = e.target.result.split('\n');
        const delimitador = e.target.result.includes(';') ? ';' : ',';
        let res = '';
        for (let i = (linhas[0].toLowerCase().includes('nome') ? 1 : 0); i < linhas.length; i++) {
            if (!linhas[i].trim()) continue;
            const col = linhas[i].split(delimitador);
            const nome = col[0] ? col[0].trim().replace(/["']/g, '') : '';
            const turma = col[1] ? col[1].trim().replace(/["']/g, '') : '';
            if (nome) res += turma ? `${nome} - ${turma}\n` : `${nome}\n`;
        }
        document.getElementById('alunos').value = res.trim();
        document.getElementById('csvInput').value = ''; 
    };
    reader.readAsText(file, 'ISO-8859-1');
}
