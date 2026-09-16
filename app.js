let turmasCadastradas = [];
let estadoAtual = {
    disciplina: '', alunos: [], numSalas: 2, numFileiras: 5, numCarteiras: 6,
    agrupamento: 'solo', tamanhoGrupo: 3, regraTurma: 'nenhuma',
    alunosFrente: [], incompativeis: [], inseparaveis: [], alunosPCD: [], 
    resultado: null, selecao: null, isEditMode: true 
};

// --- GERENCIADOR DE TURMAS ---
function adicionarTurma() {
    const nomeEl = document.getElementById('nomeTurmaNova');
    const alunosEl = document.getElementById('alunosTurmaNova');
    const nome = nomeEl.value.trim() || `Turma ${turmasCadastradas.length + 1}`;
    const nomesAlunos = alunosEl.value.split('\n').map(a => a.trim()).filter(a => a);
    
    if (nomesAlunos.length === 0) return mostrarErro('Insira pelo menos um aluno na turma.');
    
    turmasCadastradas.push({ nome, alunos: nomesAlunos });
    nomeEl.value = '';
    alunosEl.value = '';
    renderizarTurmas();
    limparErro();
}

function renderizarTurmas() {
    const container = document.getElementById('turmasContainer');
    container.innerHTML = turmasCadastradas.map((t, index) => `
        <div class="bg-surface-variant border border-outline-variant rounded px-3 py-1 flex items-center gap-2 text-sm">
            <span class="font-bold text-primary">${t.nome}</span>
            <span class="text-on-surface-variant text-xs">(${t.alunos.length})</span>
            <button type="button" onclick="removerTurma(${index})" class="text-error hover:text-red-400 ml-1">
                <span class="material-symbols-outlined text-[14px]">close</span>
            </button>
        </div>
    `).join('');
}

function removerTurma(index) {
    turmasCadastradas.splice(index, 1);
    renderizarTurmas();
}

function processarCSV(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        const linhas = e.target.result.split('\n');
        const delimitador = e.target.result.includes(';') ? ';' : ',';
        const inicio = (linhas[0].toLowerCase().includes('nome') ? 1 : 0);
        
        const turmasTemp = {};
        for (let i = inicio; i < linhas.length; i++) {
            if (!linhas[i].trim()) continue;
            const col = linhas[i].split(delimitador);
            const nome = col[0] ? col[0].trim().replace(/["']/g, '') : '';
            const turmaNome = col[1] ? col[1].trim().replace(/["']/g, '') : 'Geral';
            if (nome) {
                if (!turmasTemp[turmaNome]) turmasTemp[turmaNome] = [];
                turmasTemp[turmaNome].push(nome);
            }
        }
        for (let t in turmasTemp) {
            turmasCadastradas.push({ nome: t, alunos: turmasTemp[t] });
        }
        renderizarTurmas();
        document.getElementById('csvInput').value = ''; 
    };
    reader.readAsText(file, 'ISO-8859-1');
}

// --- SISTEMA DE AUTOCOMPLETAR ---
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
            dropdown.classList.add('hidden'); return;
        }

        const nomesDisponiveis = [];
        turmasCadastradas.forEach(t => t.alunos.forEach(a => nomesDisponiveis.push(a)));

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

setupAutocomplete('alunosFrente', 'dropFrente', '\n');
setupAutocomplete('alunosIncompativeis', 'dropIncomp', '\n');
setupAutocomplete('alunosInseparaveis', 'dropInseparaveis', ',');
setupAutocomplete('alunosPCD', 'dropPCD', '\n');


// --- MOTOR DE MAPEAMENTO ---
function embaralhar() {
    const erro = validarEntrada();
    if (erro) return mostrarErro(erro);
    
    limparErro();
    coletarDados();
    
    estadoAtual.selecao = null; 
    estadoAtual.isEditMode = true; 
    
    const resultado = processarEmbaralhamento();
    estadoAtual.resultado = resultado;
    
    exibirResultados(resultado);
    
    document.getElementById('formSection').style.display = 'none';
    const resSec = document.getElementById('resultSection');
    resSec.classList.remove('hidden');
    resSec.style.display = 'flex';
    document.getElementById('editControls').classList.remove('hidden');
    document.getElementById('exportControls').classList.add('hidden');
}

function validarEntrada() {
    const discEl = document.getElementById('disciplina');
    if (!discEl) return '❌ Erro de interface: Recarregue a página.';
    if (turmasCadastradas.length === 0) return '❌ Cadastre ou importe pelo menos uma turma.';

    const numSalas = parseInt(document.getElementById('numSalas')?.value) || 1;
    const numFileiras = parseInt(document.getElementById('numFileiras')?.value) || 1;
    const numCarteiras = parseInt(document.getElementById('numCarteiras')?.value) || 1;
    
    let multiplicador = 1;
    const agrupamento = document.getElementById('agrupamento')?.value || 'solo';
    if (agrupamento === 'dupla') multiplicador = 2;
    if (agrupamento === 'grupo') multiplicador = parseInt(document.getElementById('tamanhoGrupo')?.value) || 3;

    const numMesas = numSalas * numFileiras * numCarteiras;
    const capacidadeBase = numMesas * multiplicador;
    
    const numAlunos = turmasCadastradas.reduce((acc, t) => acc + t.alunos.length, 0);
    const pcdRaw = document.getElementById('alunosPCD')?.value || '';
    const pcdList = pcdRaw.split('\n').filter(a => a.trim()).map(a => a.trim().toLowerCase());
    
    let pcdCount = 0;
    turmasCadastradas.forEach(t => t.alunos.forEach(a => {
        if (pcdList.some(p => a.toLowerCase().includes(p))) pcdCount++;
    }));

    const vagasPerdidas = pcdCount * (multiplicador - 1);
    
    if (numAlunos + vagasPerdidas > capacidadeBase) {
        return `❌ Falta espaço! Temos ${numAlunos} alunos (e ${pcdCount} PCDs ocupando mesas sozinhos), mas a capacidade configurada só atende ${capacidadeBase} alunos.`;
    }
    return null;
}

function coletarDados() {
    estadoAtual.disciplina = document.getElementById('disciplina')?.value.trim() || 'Mapeamento Geral';
    
    estadoAtual.alunos = [];
    turmasCadastradas.forEach(t => {
        t.alunos.forEach(nome => {
            estadoAtual.alunos.push({ nome: nome, turma: t.nome, original: nome });
        });
    });

    estadoAtual.numSalas = parseInt(document.getElementById('numSalas')?.value) || 2;
    estadoAtual.numFileiras = parseInt(document.getElementById('numFileiras')?.value) || 5;
    estadoAtual.numCarteiras = parseInt(document.getElementById('numCarteiras')?.value) || 6;
    estadoAtual.agrupamento = document.getElementById('agrupamento')?.value || 'solo';
    estadoAtual.tamanhoGrupo = parseInt(document.getElementById('tamanhoGrupo')?.value) || 3;
    estadoAtual.regraTurma = document.getElementById('regraTurma')?.value || 'nenhuma';
    
    estadoAtual.alunosFrente = (document.getElementById('alunosFrente')?.value || '').split('\n').filter(a => a.trim()).map(a => a.trim().toLowerCase());
    estadoAtual.incompativeis = (document.getElementById('alunosIncompativeis')?.value || '').split('\n').filter(a => a.trim()).map(a => a.trim().toLowerCase());
    estadoAtual.alunosPCD = (document.getElementById('alunosPCD')?.value || '').split('\n').filter(a => a.trim()).map(a => a.trim().toLowerCase());
    
    const insepRaw = document.getElementById('alunosInseparaveis')?.value || '';
    estadoAtual.inseparaveis = insepRaw.split('\n').filter(l => l.trim()).map(l => l.split(',').map(n => n.trim().toLowerCase()).filter(n => n));
}

function processarEmbaralhamento() {
    const { alunos, numSalas, numFileiras, numCarteiras, agrupamento, tamanhoGrupo, alunosFrente, incompativeis, inseparaveis, alunosPCD, regraTurma } = estadoAtual;
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

    alunosEmbaralhados.forEach(a => {
        a.pcd = alunosPCD.some(p => a.nome.toLowerCase().includes(p));
    });

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
            if (chunk.length > 0) {
                chunk.pcd = chunk.some(a => a.pcd);
                chunks.push(chunk);
            }
        });
    }
    
    alunosEmbaralhados.forEach(a => {
        if (!usedNames.has(a.nome)) {
            let c = [a];
            c.pcd = a.pcd;
            chunks.push(c);
        }
    });

    const isFrente = (a) => alunosFrente.includes(a.nome.toLowerCase()) || alunosFrente.includes(a.original.toLowerCase());
    const isIncompativel = (a) => incompativeis.some(inc => a.nome.toLowerCase().includes(inc) || a.original.toLowerCase().includes(inc));
    
    let chunksFrente = chunks.filter(c => c.some(isFrente));
    let chunksNormais = chunks.filter(c => !c.some(isFrente));
    
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
    
    let finalFrente = mesclarEspacado(chunksFrente.filter(c => c.some(isIncompativel)), chunksFrente.filter(c => !c.some(isIncompativel)));
    let finalNormais = mesclarEspacado(chunksNormais.filter(c => c.some(isIncompativel)), chunksNormais.filter(c => !c.some(isIncompativel)));

    const tamanho = agrupamento === 'solo' ? 1 : (agrupamento === 'dupla' ? 2 : tamanhoGrupo);
    const numGruposFrente = numSalas * numFileiras;
    let gruposFrente = Array.from({ length: numGruposFrente }, () => []);
    let gruposGerais = [];
    
    function canFit(desk, chunk) {
        if (desk.length === 0) return chunk.length <= tamanho;
        if (desk.some(a => a.pcd) || chunk.pcd) return false;
        return desk.length + chunk.length <= tamanho;
    }

    let indexFrente = 0;
    while(finalFrente.length > 0) {
        let chunk = finalFrente.shift();
        let found = false;
        for(let i = 0; i < numGruposFrente; i++) {
            let idx = (indexFrente + i) % numGruposFrente;
            if (canFit(gruposFrente[idx], chunk)) {
                gruposFrente[idx] = gruposFrente[idx].concat(chunk);
                indexFrente = idx + 1;
                found = true; break;
            }
        }
        if(!found) finalNormais.unshift(chunk);
    }
    
    for(let i = 0; i < numGruposFrente; i++) {
        while(finalNormais.length > 0) {
            let chunk = finalNormais[0];
            if (canFit(gruposFrente[i], chunk)) {
                gruposFrente[i] = gruposFrente[i].concat(finalNormais.shift());
            } else {
                let fitIdx = finalNormais.findIndex(c => canFit(gruposFrente[i], c));
                if (fitIdx !== -1) {
                    gruposFrente[i] = gruposFrente[i].concat(finalNormais.splice(fitIdx, 1)[0]);
                } else {
                    if (gruposFrente[i].some(a => a.pcd) || finalNormais[0].pcd) break;
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
        if (canFit(currentDesk, chunk)) {
            currentDesk = currentDesk.concat(finalNormais.shift());
            if (currentDesk.length === tamanho || currentDesk.some(a=>a.pcd)) {
                gruposGerais.push(currentDesk);
                currentDesk = [];
            }
        } else {
            let fitIdx = finalNormais.findIndex(c => canFit(currentDesk, c));
            if (fitIdx !== -1) {
                currentDesk = currentDesk.concat(finalNormais.splice(fitIdx, 1)[0]);
                if (currentDesk.length === tamanho || currentDesk.some(a=>a.pcd)) {
                    gruposGerais.push(currentDesk);
                    currentDesk = [];
                }
            } else {
                if (currentDesk.some(a=>a.pcd) || finalNormais[0].pcd) {
                    gruposGerais.push(currentDesk);
                    currentDesk = [];
                    continue;
                }
                let space = tamanho - currentDesk.length;
                currentDesk = currentDesk.concat(finalNormais[0].splice(0, space));
                if (finalNormais[0].length === 0) finalNormais.shift();
                gruposGerais.push(currentDesk);
                currentDesk = [];
            }
        }
    }
    if (currentDesk.length > 0) gruposGerais.push(currentDesk);
    
    const salas = distribuirEmSalas(gruposGerais, numSalas, numFileiras, numCarteiras, alunosFrente);

    return {
        disciplina: estadoAtual.disciplina, data: new Date().toLocaleDateString('pt-BR'),
        totalAlunos: alunos.length, numSalas, numFileiras, numCarteiras, agrupamento, salas
    };
}

function distribuirEmSalas(grupos, numSalas, numFileiras, numCarteiras, alunosFrente) {
    const salas = Array.from({ length: numSalas }, () => []);
    const assentosPorSala = Array(numSalas).fill(0);

    grupos.forEach((grupo, index) => {
        const salaAtual = index % numSalas;
        const assentoIndex = assentosPorSala[salaAtual];
        const fileira = assentoIndex % numFileiras; 
        const carteira = Math.floor(assentoIndex / numFileiras); 

        if (carteira < numCarteiras) { 
            const proximoProfessor = grupo.some(g => alunosFrente.includes(g.nome.toLowerCase()) || alunosFrente.includes(g.original.toLowerCase()));
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
}


// --- ESTADOS (TRAVA E DESTRAVA) ---
function travarMapa() {
    estadoAtual.isEditMode = false;
    estadoAtual.selecao = null;
    document.getElementById('editControls').classList.add('hidden');
    document.getElementById('exportControls').classList.remove('hidden');
    desenharMapa(estadoAtual.resultado);
}

function destravarMapa() {
    estadoAtual.isEditMode = true;
    document.getElementById('editControls').classList.remove('hidden');
    document.getElementById('exportControls').classList.add('hidden');
    desenharMapa(estadoAtual.resultado);
}


// --- TROCA DE ALUNOS ---
function processarCliqueCarteira(salaIndex, coluna, linha) {
    if (!estadoAtual.isEditMode) return; 

    if (!estadoAtual.selecao) {
        estadoAtual.selecao = { salaIndex, fileira: coluna, carteira: linha };
        desenharMapa(estadoAtual.resultado);
        return;
    }

    if (estadoAtual.selecao.salaIndex === salaIndex && estadoAtual.selecao.fileira === coluna && estadoAtual.selecao.carteira === linha) {
        estadoAtual.selecao = null; 
        desenharMapa(estadoAtual.resultado);
        return;
    }

    const sel = estadoAtual.selecao;
    let salaA = estadoAtual.resultado.salas[sel.salaIndex];
    let salaB = estadoAtual.resultado.salas[salaIndex];

    let idxA = salaA.findIndex(c => c.fileira === sel.fileira && c.carteira === sel.carteira);
    let idxB = salaB.findIndex(c => c.fileira === coluna && c.carteira === linha);

    let objA = idxA !== -1 ? { ...salaA[idxA] } : null;
    let objB = idxB !== -1 ? { ...salaB[idxB] } : null;

    if (objA) { objA.fileira = coluna; objA.carteira = linha; }
    if (objB) { objB.fileira = sel.fileira; objB.carteira = sel.carteira; }

    estadoAtual.resultado.salas[sel.salaIndex] = salaA.filter(c => !(c.fileira === sel.fileira && c.carteira === sel.carteira));
    estadoAtual.resultado.salas[salaIndex] = estadoAtual.resultado.salas[salaIndex].filter(c => !(c.fileira === coluna && c.carteira === linha));

    if (objA) estadoAtual.resultado.salas[salaIndex].push(objA);
    if (objB) estadoAtual.resultado.salas[sel.salaIndex].push(objB);

    estadoAtual.selecao = null; 
    desenharMapa(estadoAtual.resultado);
    gerarListaDetalhada(estadoAtual.resultado);
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
        
        if (estadoAtual.isEditMode) {
            canvas.className = 'rounded border border-gray-200 cursor-pointer hover:border-blue-400 hover:shadow-md transition-all';
        } else {
            canvas.className = 'rounded border border-gray-200';
        }
        
        canvas.addEventListener('click', function(e) {
            if (!estadoAtual.isEditMode) return; 
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            const clickX = (e.clientX - rect.left) * scaleX;
            const clickY = (e.clientY - rect.top) * scaleY;

            const espacoX = (SALA_LARGURA - 30) / resultado.numFileiras; 
            const espacoY = (SALA_ALTURA - 90) / resultado.numCarteiras; 
            const deskW = Math.min(espacoX * 0.85, 80); 
            const deskH = Math.min(espacoY * 0.85, 45);

            for (let linha = 0; linha < resultado.numCarteiras; linha++) {
                for (let coluna = 0; coluna < resultado.numFileiras; coluna++) {
                    const px = MARGEM + 15 + coluna * espacoX + (espacoX - deskW) / 2;
                    const py = MARGEM + 80 + linha * espacoY + (espacoY - deskH) / 2;
                    
                    if (clickX >= px && clickX <= px + deskW && clickY >= py && clickY <= py + deskH) {
                        processarCliqueCarteira(indSala, coluna, linha);
                        return;
                    }
                }
            }
        });
        
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        desenharSala(ctx, MARGEM, MARGEM, SALA_LARGURA, SALA_ALTURA, sala, indSala + 1, resultado);
        roomCard.appendChild(canvas);
        
        if (!estadoAtual.isEditMode) {
            const btnExportar = document.createElement('button');
            btnExportar.className = 'w-full py-2 rounded font-label-mono flex items-center justify-center gap-2 border border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-700 transition-colors text-sm font-bold';
            btnExportar.innerHTML = `<span class="material-symbols-outlined text-[18px]">image</span> EXPORTAR SALA ${indSala + 1}`;
            btnExportar.onclick = () => {
                const a = document.createElement('a');
                a.href = canvas.toDataURL('image/png');
                a.download = `SALA-${indSala + 1}-${estadoAtual.disciplina || 'mapeamento'}.png`;
                document.body.appendChild(a); a.click(); document.body.removeChild(a);
            };
            roomCard.appendChild(btnExportar);
        }
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
            
            const isSelecionada = estadoAtual.isEditMode && estadoAtual.selecao && 
                                  estadoAtual.selecao.salaIndex === (numSala - 1) && 
                                  estadoAtual.selecao.fileira === coluna && 
                                  estadoAtual.selecao.carteira === linha;

            ctx.beginPath();
            if (ctx.roundRect) ctx.roundRect(px, py, deskW, deskH, 4);
            else ctx.rect(px, py, deskW, deskH);

            if (isSelecionada) {
                if (ctx.setLineDash) ctx.setLineDash([4, 4]);
                ctx.fillStyle = '#fef08a'; ctx.strokeStyle = '#eab308'; ctx.lineWidth = 3;
            } else if (carteiraAtual) {
                if (ctx.setLineDash) ctx.setLineDash([]);
                ctx.fillStyle = carteiraAtual.proximoProfessor ? '#fef3c7' : '#e0e7ff'; 
                ctx.strokeStyle = carteiraAtual.proximoProfessor ? '#f59e0b' : '#3b82f6';
                ctx.lineWidth = carteiraAtual.proximoProfessor ? 2 : 1;
            } else {
                if (ctx.setLineDash) ctx.setLineDash([]);
                ctx.fillStyle = '#f9fafb'; ctx.strokeStyle = '#d1d5db'; ctx.lineWidth = 1;
            }
            
            ctx.fill(); ctx.stroke();
            if (ctx.setLineDash) ctx.setLineDash([]); 
            
            if (carteiraAtual) {
                const hasPCD = carteiraAtual.grupo.some(a => a.pcd);
                ctx.fillStyle = '#111827'; ctx.font = 'bold 10px Courier Prime, monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                const stepY = 12;
                
                let startY = py + deskH / 2 - ((carteiraAtual.grupo.length - 1 + (hasPCD ? 1 : 0)) * stepY) / 2;
                carteiraAtual.grupo.forEach(a => {
                    const parts = a.nome.split(' ');
                    ctx.fillText(parts[0] + (parts.length > 1 ? ' ' + parts[parts.length-1].charAt(0) + '.' : ''), px + deskW / 2, startY);
                    startY += stepY;
                });
                
                if (hasPCD) {
                    ctx.fillStyle = '#ef4444'; 
                    ctx.font = 'bold 9px Courier Prime, monospace';
                    ctx.fillText('[+ Auxiliar]', px + deskW / 2, startY);
                }
            }
        }
    }
}

function gerarListaDetalhada(resultado) {
    let html = '';
    resultado.salas.forEach((sala, indSala) => {
        html += `<div class="room-list mb-6"><div class="font-headline-lg-mobile text-black mb-3 border-b border-gray-200 pb-2">SALA ${indSala + 1}</div>`;
        sala.forEach((carteira, idx) => {
            const hasPCD = carteira.grupo.some(a => a.pcd);
            const nomes = carteira.grupo.map(a => `<strong class="text-black">${a.nome}</strong> <span class="text-gray-500 text-xs">(${a.turma})</span>`).join(' + ');
            const proximoClass = carteira.proximoProfessor ? 'border-l-4 border-amber-500 bg-amber-50' : 'border border-gray-300 bg-white';
            html += `<div class="p-3 mb-2 rounded flex items-center gap-4 ${proximoClass}">
                <div class="bg-gray-200 text-gray-800 px-3 py-1 rounded text-sm font-label-mono font-bold">${idx + 1}</div>
                <div class="flex-1 font-body-md text-gray-900">${nomes} ${hasPCD ? '<span class="text-red-500 text-xs font-bold ml-2">[+ Auxiliar]</span>' : ''}</div>
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
    turmasCadastradas = [];
    renderizarTurmas();
    ['disciplina', 'alunosFrente', 'alunosIncompativeis', 'alunosInseparaveis', 'alunosPCD'].forEach(id => document.getElementById(id).value = '');
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
