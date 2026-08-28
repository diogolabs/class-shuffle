let estadoAtual = {
    disciplina: '', alunos: [], numSalas: 2, numFileiras: 5, numCarteiras: 6,
    agrupamento: 'solo', tamanhoGrupo: 3, regraTurma: 'nenhuma',
    alunosEspeciais: [], proximoProfessor: false, mesmaFileira: false, resultado: null
};

// Exibir campo de tamanho de grupo dinamicamente
document.getElementById('agrupamento')?.addEventListener('change', function(e) {
    const el = document.getElementById('tamanhoGrupoGroup');
    if (el) el.style.display = e.target.value === 'grupo' ? 'flex' : 'none';
});

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
        resSec.classList.remove('hidden'); // Revela o painel do Tailwind
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
    
    estadoAtual.proximoProfessor = document.getElementById('proximoProfessor')?.checked || false;
    estadoAtual.mesmaFileira = document.getElementById('mesmaFileira')?.checked || false;
}

function processarEmbaralhamento() {
    const { alunos, numSalas, numFileiras, numCarteiras, agrupamento, tamanhoGrupo, alunosEspeciais, mesmaFileira, regraTurma } = estadoAtual;

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

    const especiais = alunosEmbaralhados.filter(a => alunosEspeciais.includes(a.nome.toLowerCase()) || alunosEspeciais.includes(a.original.toLowerCase()));
    const normais = alunosEmbaralhados.filter(a => !especiais.includes(a));

    let grupos;
    if (agrupamento === 'solo') {
        grupos = especiais.concat(normais).map(a => [a]);
    } else if (agrupamento === 'dupla') {
        grupos = criarGrupos(especiais, 2, mesmaFileira).concat(criarGrupos(normais, 2, mesmaFileira));
    } else {
        grupos = criarGrupos(especiais, tamanhoGrupo, mesmaFileira).concat(criarGrupos(normais, tamanhoGrupo, mesmaFileira));
    }

    const salas = distribuirEmSalas(grupos, numSalas, numFileiras, numCarteiras, especiais);

    return {
        disciplina: estadoAtual.disciplina, data: new Date().toLocaleDateString('pt-BR'),
        totalAlunos: alunos.length, numSalas, numFileiras, numCarteiras, agrupamento, salas
    };
}

function criarGrupos(lista, tamanho, embaralharInterno) {
    if (embaralharInterno) lista = [...lista].sort(() => Math.random() - 0.5);
    const grupos = [];
    for (let i = 0; i < lista.length; i += tamanho) {
        grupos.push(lista.slice(i, i + tamanho));
    }
    return grupos;
}

function distribuirEmSalas(grupos, numSalas, numFileiras, numCarteiras, especiais) {
    const salas = Array.from({ length: numSalas }, () => []);
    const assentosPorSala = Array(numSalas).fill(0);

    grupos.forEach((grupo, index) => {
        const salaAtual = index % numSalas;
        const assentoIndex = assentosPorSala[salaAtual];
        
        const fileira = Math.floor(assentoIndex / numCarteiras);
        const carteira = assentoIndex % numCarteiras;

        if (fileira < numFileiras) {
            const proximoProfessor = grupo.some(g => especiais.includes(g));
            salas[salaAtual].push({ fileira, carteira, grupo, proximoProfessor });
            assentosPorSala[salaAtual]++;
        }
    });

    return salas;
}

function exibirResultados(resultado) {
    const statsHtml = `
        <div class="bg-surface-container-low p-4 rounded-lg border border-outline-variant flex flex-col items-center justify-center relative overflow-hidden">
            <span class="text-on-surface-variant text-xs font-label-mono mb-1">TOTAL ALUNOS</span>
            <span class="font-headline-lg text-primary">${resultado.totalAlunos}</span>
        </div>
        <div class="bg-surface-container-low p-4 rounded-lg border border-outline-variant flex flex-col items-center justify-center">
            <span class="text-on-surface-variant text-xs font-label-mono mb-1">SALAS USADAS</span>
            <span class="font-headline-lg text-primary">${resultado.numSalas}</span>
        </div>
        <div class="bg-surface-container-low p-4 rounded-lg border border-outline-variant flex flex-col items-center justify-center">
            <span class="text-on-surface-variant text-xs font-label-mono mb-1">VAGAS TOTAIS</span>
            <span class="font-headline-lg text-secondary-container">${resultado.numSalas * resultado.numFileiras * resultado.numCarteiras}</span>
        </div>
    `;
    const stEl = document.getElementById('stats');
    if (stEl) stEl.innerHTML = statsHtml;
    
    desenharMapa(resultado);
    gerarListaDetalhada(resultado);
    
    const sucEl = document.getElementById('successMessage');
    if (sucEl) {
        sucEl.innerHTML = `<span class="material-symbols-outlined align-middle mr-2">check_circle</span> Embaralhamento concluído! ${resultado.data}`;
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

    // Fundo do canvas transparente para herdar o tema escuro
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    resultado.salas.forEach((sala, indSala) => {
        const linha = Math.floor(indSala / numSalasLinha);
        const coluna = indSala % numSalasLinha;
        const x = MARGEM + coluna * (SALA_LARGURA + PADDING);
        const y = MARGEM + linha * (SALA_ALTURA + PADDING);
        desenharSala(ctx, x, y, SALA_LARGURA, SALA_ALTURA, sala, indSala + 1, resultado);
    });
}

function desenharSala(ctx, x, y, largura, altura, carteirasOcupadas, numSala, resultado) {
    // Desenha o bloco branco da sala para manter contraste das letras escuras
    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#969178'; ctx.lineWidth = 2;
    ctx.fillRect(x, y, largura, altura); ctx.strokeRect(x, y, largura, altura);
    
    ctx.fillStyle = '#14130e'; ctx.font = 'bold 16px Courier Prime, monospace'; ctx.textAlign = 'left';
    ctx.fillText(`SALA ${numSala}`, x + 15, y + 25);
    
    ctx.fillStyle = '#36352e'; ctx.fillRect(x + largura / 2 - 60, y + 10, 120, 15);
    ctx.fillStyle = '#ffffff'; ctx.font = '10px Courier Prime, monospace'; ctx.textAlign = 'center';
    ctx.fillText('LOUSA', x + largura / 2, y + 21);
    
    ctx.fillStyle = '#f4e225'; ctx.fillRect(x + 15, y + 45, 45, 25);
    ctx.fillStyle = '#1f1c00'; ctx.font = 'bold 11px Courier Prime, monospace'; ctx.fillText('Prof.', x + 37, y + 62);

    const numCarteiras = resultado.numCarteiras;
    const numFileiras = resultado.numFileiras;
    const areaYStart = y + 80; const areaAltura = altura - 90;
    const espacoX = (largura - 30) / numCarteiras; const espacoY = areaAltura / numFileiras;
    const deskW = Math.min(espacoX * 0.85, 80); const deskH = Math.min(espacoY * 0.85, 45);

    for (let f = 0; f < numFileiras; f++) {
        for (let c = 0; c < numCarteiras; c++) {
            const px = x + 15 + c * espacoX + (espacoX - deskW) / 2;
            const py = areaYStart + f * espacoY + (espacoY - deskH) / 2;
            const carteiraAtual = carteirasOcupadas.find(cart => cart.fileira === f && cart.carteira === c);

            ctx.beginPath();
            if (ctx.roundRect) ctx.roundRect(px, py, deskW, deskH, 4);
            else ctx.rect(px, py, deskW, deskH);

            if (carteiraAtual) {
                if (carteiraAtual.proximoProfessor) {
                    ctx.fillStyle = '#fef3c7'; ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 2;
                } else {
                    ctx.fillStyle = '#e0e7ff'; ctx.strokeStyle = '#00eefc'; ctx.lineWidth = 1;
                }
                ctx.fill(); ctx.stroke();
                ctx.fillStyle = '#14130e'; ctx.font = 'bold 10px Courier Prime, monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                
                const stepY = 12;
                let startY = py + deskH / 2 - ((carteiraAtual.grupo.length - 1) * stepY) / 2;
                carteiraAtual.grupo.forEach(alunoObj => {
                    const parts = alunoObj.nome.split(' ');
                    const nomeCurto = parts[0] + (parts.length > 1 ? ' ' + parts[parts.length-1].charAt(0) + '.' : '');
                    ctx.fillText(nomeCurto, px + deskW / 2, startY);
                    startY += stepY;
                });
            } else {
                ctx.fillStyle = '#f8fafc'; ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1;
                ctx.fill(); ctx.stroke();
            }
        }
    }
}

function gerarListaDetalhada(resultado) {
    let html = '';
    resultado.salas.forEach((sala, indSala) => {
        html += `<div class="room-list mb-6"><div class="font-headline-lg-mobile text-primary mb-3">SALA ${indSala + 1}</div>`;
        sala.forEach((carteira, idx) => {
            const nomes = carteira.grupo.map(a => `<strong class="text-secondary-container">${a.nome}</strong> <span class="text-outline text-xs">(${a.turma})</span>`).join(' + ');
            const proximoClass = carteira.proximoProfessor ? 'border-l-4 border-primary-container bg-primary-container/10' : 'border border-outline-variant bg-surface-container-low';
            
            html += `<div class="p-3 mb-2 rounded flex items-center gap-4 ${proximoClass}">
                <div class="bg-surface-container-highest text-on-surface px-3 py-1 rounded text-sm font-label-mono">${idx + 1}</div>
                <div class="flex-1 font-body-md">${nomes}</div>
                ${carteira.proximoProfessor ? '<div class="text-xs font-label-mono text-primary-container uppercase tracking-widest">Frente</div>' : ''}
            </div>`;
        });
        html += '</div>';
    });
    const listEl = document.getElementById('listContainer');
    if (listEl) listEl.innerHTML = html;
}

function mudarAba(abaNome, event) {
    // Reseta botões
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('tab-active', 'text-primary');
        btn.classList.add('text-on-surface-variant');
    });
    
    // Esconde os painéis
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.add('hidden');
    });
    
    // Ativa botão clicado
    if(event) {
        event.target.classList.add('tab-active', 'text-primary');
        event.target.classList.remove('text-on-surface-variant');
    }
    
    // Mostra painel alvo
    const abaEl = document.getElementById(abaNome);
    if (abaEl) abaEl.classList.remove('hidden');
}

function imprimirResultado() { window.print(); }

function exportarJSON() {
    if (!estadoAtual.resultado) return;
    const json = JSON.stringify(estadoAtual.resultado, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `embaralhamento-${estadoAtual.disciplina}-${new Date().getTime()}.json`;
    a.click();
}

function voltarFormulario() {
    const resSec = document.getElementById('resultSection');
    const formSec = document.getElementById('formSection');
    
    if (resSec) resSec.classList.add('hidden');
    if (formSec) formSec.style.display = 'flex';
}

function limparFormulario() {
    ['disciplina', 'alunos', 'alunosEspeciais'].forEach(id => {
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
