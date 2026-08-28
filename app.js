let estadoAtual = {
    disciplina: '', alunos: [], numSalas: 2, numFileiras: 5, numCarteiras: 6,
    agrupamento: 'solo', tamanhoGrupo: 3, regraTurma: 'nenhuma',
    alunosEspeciais: [], incompativeis: [], proximoProfessor: false, mesmaFileira: false, resultado: null
};

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
    
    const disciplina = discEl.value.trim();
    const alunosText = alunosEl.value.trim();

    if (!disciplina) return '❌ Por favor, preencha a disciplina';
    if (!alunosText) return '❌ Por favor, adicione pelo menos um aluno';

    const numAlunos = alunosText.split('\n').filter(a => a.trim()).length;
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
    
    const especiaisRaw = document.getElementById('alunosEspeciais')?.value.trim() || '';
    estadoAtual.alunosEspeciais = especiaisRaw.split('\n').filter(a => a.trim()).map(a => a.trim().toLowerCase());
    
    const incompRaw = document.getElementById('alunosIncompativeis')?.value.trim() || '';
    estadoAtual.incompativeis = incompRaw.split('\n').filter(a => a.trim()).map(a => a.trim().toLowerCase());
}

function processarEmbaralhamento() {
    const { alunos, numSalas, numFileiras, numCarteiras, agrupamento, tamanhoGrupo, alunosEspeciais, incompativeis, regraTurma } = estadoAtual;

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

    const especiaisList = alunosEmbaralhados.filter(a => alunosEspeciais.includes(a.nome.toLowerCase()) || alunosEspeciais.includes(a.original.toLowerCase()));
    let normais = alunosEmbaralhados.filter(a => !especiaisList.includes(a));

    const tamanho = agrupamento === 'solo' ? 1 : (agrupamento === 'dupla' ? 2 : tamanhoGrupo);
    
    // Calcula o total de mesas disponíveis apenas na linha de frente (carteira 0) somando todas as salas e fileiras
    const numGruposFrente = numSalas * numFileiras;
    let gruposFrente = Array.from({ length: numGruposFrente }, () => []);
    let grupos = [];

    // Separa os incompativeis dos especiais para espalhá-los primeiro na linha de frente
    let espIncomp = [];
    let espResto = [];
    especiaisList.forEach(a => {
        if (incompativeis.some(inc => a.nome.toLowerCase().includes(inc) || a.original.toLowerCase().includes(inc))) {
            espIncomp.push(a);
        } else {
            espResto.push(a);
        }
    });

    let queueEspeciais = espIncomp.concat(espResto);
    let indexFrente = 0;

    // Distribui os especiais pulando de mesa em mesa para evitar grupos juntos
    while (queueEspeciais.length > 0) {
        let found = false;
        for (let i = 0; i < numGruposFrente; i++) {
            let idx = (indexFrente + i) % numGruposFrente;
            if (gruposFrente[idx].length < tamanho) {
                gruposFrente[idx].push(queueEspeciais.shift());
                indexFrente = idx + 1; 
                found = true;
                break;
            }
        }
        if (!found) { // Se a linha de frente inteira de todas as salas estiver lotada
            normais = queueEspeciais.concat(normais);
            break;
        }
    }

    // Preenche os buracos nas carteiras da frente (duplas/grupos) com alunos normais
    for (let i = 0; i < numGruposFrente; i++) {
        while (gruposFrente[i].length < tamanho && normais.length > 0) {
            gruposFrente[i].push(normais.shift());
        }
        if (gruposFrente[i].length > 0) {
            grupos.push(gruposFrente[i]);
        }
    }

    // Processar Incompatíveis do RESTO da turma
    let normIncomp = [];
    let normResto = [];
    normais.forEach(a => {
        if (incompativeis.some(inc => a.nome.toLowerCase().includes(inc) || a.original.toLowerCase().includes(inc))) {
            normIncomp.push(a);
        } else {
            normResto.push(a);
        }
    });

    let normaisEspacados = [];
    if (normIncomp.length > 0 && normResto.length > 0) {
        const esp = Math.max(1, Math.floor(normResto.length / normIncomp.length));
        let idx = 0;
        for (let i = 0; i < normResto.length; i++) {
            if (i > 0 && i % esp === 0 && idx < normIncomp.length) {
                normaisEspacados.push(normIncomp[idx++]);
            }
            normaisEspacados.push(normResto[i]);
        }
        while (idx < normIncomp.length) {
            normaisEspacados.push(normIncomp[idx++]);
        }
    } else {
        normaisEspacados = normIncomp.concat(normResto);
    }

    // Agrupa os alunos normais que sentarão do meio para trás
    let currentGroup = [];
    normaisEspacados.forEach(aluno => {
        currentGroup.push(aluno);
        if (currentGroup.length === tamanho) {
            grupos.push(currentGroup);
            currentGroup = [];
        }
    });
    if (currentGroup.length > 0) grupos.push(currentGroup);

    const salas = distribuirEmSalas(grupos, numSalas, numFileiras, numCarteiras, especiaisList);

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
            const proximoProfessor = grupo.some(g => especiais.includes(g));
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
    const stEl = document.getElementById('stats');
    if (stEl) stEl.innerHTML = statsHtml;
    
    desenharMapa(resultado);
    gerarListaDetalhada(resultado);
    
    const sucEl = document.getElementById('successMessage');
    if (sucEl) {
        sucEl.innerHTML = `<span class="material-symbols-outlined align-middle mr-2">check_circle</span> Mapeamento concluído! ${resultado.data}`;
        sucEl.classList.remove('hidden');
    }
}

function desenharMapa(resultado) {
    const canvas = document.getElementById('mapCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    const SALA_LARGURA = 420; const SALA_ALTURA = 350; const MARGEM = 20; const PADDING = 40;
    const numSalasLinha = Math.ceil(Math.sqrt(resultado.numSalas));
    const numSalasColuna = Math.ceil(resultado.numSalas / numSalasLinha);

    canvas.width = numSalasLinha * (SALA_LARGURA + PADDING) + MARGEM * 2;
    canvas.height = numSalasColuna * (SALA_ALTURA + PADDING) + MARGEM * 2;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    resultado.salas.forEach((sala, indSala) => {
        const linha = Math.floor(indSala / numSalasLinha);
        const coluna = indSala % numSalasLinha;
        const x = MARGEM + coluna * (SALA_LARGURA + PADDING);
        const y = MARGEM + linha * (SALA_ALTURA + PADDING);
        desenharSala(ctx, x, y, SALA_LARGURA, SALA_ALTURA, sala, indSala + 1, resultado);
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

    const numFileirasColunas = resultado.numFileiras; 
    const numCarteirasLinhas = resultado.numCarteiras; 
    
    const areaYStart = y + 80; const areaAltura = altura - 90;
    const espacoX = (largura - 30) / numFileirasColunas; 
    const espacoY = areaAltura / numCarteirasLinhas; 
    const deskW = Math.min(espacoX * 0.85, 80); 
    const deskH = Math.min(espacoY * 0.85, 45);

    for (let linha = 0; linha < numCarteirasLinhas; linha++) {
        for (let coluna = 0; coluna < numFileirasColunas; coluna++) {
            const px = x + 15 + coluna * espacoX + (espacoX - deskW) / 2;
            const py = areaYStart + linha * espacoY + (espacoY - deskH) / 2;
            
            const carteiraAtual = carteirasOcupadas.find(cart => cart.fileira === coluna && cart.carteira === linha);

            ctx.beginPath();
            if (ctx.roundRect) ctx.roundRect(px, py, deskW, deskH, 4);
            else ctx.rect(px, py, deskW, deskH);

            if (carteiraAtual) {
                if (carteiraAtual.proximoProfessor) {
                    ctx.fillStyle = '#fef3c7'; ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 2;
                } else {
                    ctx.fillStyle = '#e0e7ff'; ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 1;
                }
                ctx.fill(); ctx.stroke();
                ctx.fillStyle = '#111827'; ctx.font = 'bold 10px Courier Prime, monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                
                const stepY = 12;
                let startY = py + deskH / 2 - ((carteiraAtual.grupo.length - 1) * stepY) / 2;
                carteiraAtual.grupo.forEach(alunoObj => {
                    const parts = alunoObj.nome.split(' ');
                    const nomeCurto = parts[0] + (parts.length > 1 ? ' ' + parts[parts.length-1].charAt(0) + '.' : '');
                    ctx.fillText(nomeCurto, px + deskW / 2, startY);
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
    const listEl = document.getElementById('listContainer');
    if (listEl) listEl.innerHTML = html;
}

function mudarAba(abaNome, event) {
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('bg-white', 'text-black', 'shadow-sm', 'active');
        btn.classList.add('text-gray-600');
    });
    
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.add('hidden');
        content.classList.remove('active');
    });
    
    if(event) {
        event.target.classList.add('bg-white', 'text-black', 'shadow-sm', 'active');
        event.target.classList.remove('text-gray-600');
    }
    
    const abaEl = document.getElementById(abaNome);
    if (abaEl) {
        abaEl.classList.remove('hidden');
        abaEl.classList.add('active');
    }
}

function imprimirResultado() { window.print(); }

function exportarJSON() {
    if (!estadoAtual.resultado) return;
    const json = JSON.stringify(estadoAtual.resultado, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mapeamento-${estadoAtual.disciplina}-${new Date().getTime()}.json`;
    a.click();
}

function voltarFormulario() {
    const resSec = document.getElementById('resultSection');
    const formSec = document.getElementById('formSection');
    
    if (resSec) {
        resSec.classList.add('hidden');
        resSec.style.display = 'none';
    }
    if (formSec) formSec.style.display = 'flex';
}

function limparFormulario() {
    ['disciplina', 'alunos', 'alunosEspeciais', 'alunosIncompativeis'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    limparErro();
}

function mostrarErro(mensagem) {
    const errorDiv = document.getElementById('errorMessage');
    if (errorDiv) {
        errorDiv.textContent = mensagem;
        errorDiv.classList.remove('hidden');
    }
}

function limparErro() {
    const errorDiv = document.getElementById('errorMessage');
    if (errorDiv) errorDiv.classList.add('hidden');
}

function processarCSV(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const text = e.target.result;
        const delimitador = text.includes(';') ? ';' : ',';
        const linhas = text.split('\n');
        
        let resultado = '';
        const inicio = linhas[0].toLowerCase().includes('nome') ? 1 : 0;

        for (let i = inicio; i < linhas.length; i++) {
            if (!linhas[i].trim()) continue;
            const colunas = linhas[i].split(delimitador);
            const nome = colunas[0] ? colunas[0].trim().replace(/["']/g, '') : '';
            const turma = colunas[1] ? colunas[1].trim().replace(/["']/g, '') : '';
            if (nome) resultado += turma ? `${nome} - ${turma}\n` : `${nome}\n`;
        }

        const alEl = document.getElementById('alunos');
        const csvIn = document.getElementById('csvInput');
        if (alEl) alEl.value = resultado.trim();
        if (csvIn) csvIn.value = ''; 
    };
    reader.readAsText(file, 'ISO-8859-1');
}
