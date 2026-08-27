let estadoAtual = {
    disciplina: '',
    alunos: [],
    numSalas: 2,
    numFileiras: 5,
    numCarteiras: 6,
    agrupamento: 'solo',
    tamanhoGrupo: 3,
    regraTurma: 'nenhuma',
    alunosEspeciais: [],
    proximoProfessor: false,
    mesmaFileira: false,
    resultado: null
};

document.getElementById('agrupamento').addEventListener('change', function(e) {
    const tamanhoGrupoGroup = document.getElementById('tamanhoGrupoGroup');
    if (e.target.value === 'grupo') {
        tamanhoGrupoGroup.style.display = 'flex';
    } else {
        tamanhoGrupoGroup.style.display = 'none';
    }
});

function embaralhar() {
    const erro = validarEntrada();
    if (erro) {
        mostrarErro(erro);
        return;
    }
    limparErro();
    coletarDados();
    
    const resultado = processarEmbaralhamento();
    estadoAtual.resultado = resultado;
    
    exibirResultados(resultado);
    document.getElementById('formSection').style.display = 'none';
    document.getElementById('resultSection').classList.add('active');
}

function validarEntrada() {
    const disciplina = document.getElementById('disciplina').value.trim();
    const alunosText = document.getElementById('alunos').value.trim();

    if (!disciplina) return '❌ Por favor, preencha a disciplina';
    if (!alunosText) return '❌ Por favor, adicione pelo menos um aluno';

    const numAlunos = alunosText.split('\n').filter(a => a.trim()).length;
    
    const numSalas = parseInt(document.getElementById('numSalas').value);
    const numFileiras = parseInt(document.getElementById('numFileiras').value);
    const numCarteiras = parseInt(document.getElementById('numCarteiras').value);
    
    let multiplicador = 1;
    const agrupamento = document.getElementById('agrupamento').value;
    if (agrupamento === 'dupla') multiplicador = 2;
    if (agrupamento === 'grupo') multiplicador = parseInt(document.getElementById('tamanhoGrupo').value);

    const capacidadeTotal = numSalas * numFileiras * numCarteiras * multiplicador;
    
    if (numAlunos > capacidadeTotal) {
        return `❌ Não há espaço! Você tem ${numAlunos} alunos, mas apenas ${capacidadeTotal} vagas na configuração atual.`;
    }
    return null;
}

function coletarDados() {
    estadoAtual.disciplina = document.getElementById('disciplina').value.trim();
    
    // Processamento da lista de alunos separando a turma
    estadoAtual.alunos = document.getElementById('alunos').value.trim().split('\n').filter(a => a.trim()).map(a => {
        let nome = a.trim();
        let turma = 'Geral';
        if (a.includes('-')) {
            const parts = a.split('-');
            nome = parts[0].trim();
            turma = parts[1].trim();
        } else if (a.includes(',')) {
            const parts = a.split(',');
            nome = parts[0].trim();
            turma = parts[1].trim();
        }
        return { nome, turma, original: a.trim() };
    });

    estadoAtual.numSalas = parseInt(document.getElementById('numSalas').value);
    estadoAtual.numFileiras = parseInt(document.getElementById('numFileiras').value);
    estadoAtual.numCarteiras = parseInt(document.getElementById('numCarteiras').value);
    estadoAtual.agrupamento = document.getElementById('agrupamento').value;
    estadoAtual.tamanhoGrupo = parseInt(document.getElementById('tamanhoGrupo').value);
    estadoAtual.regraTurma = document.getElementById('regraTurma').value;
    estadoAtual.alunosEspeciais = document.getElementById('alunosEspeciais').value.trim().split('\n').filter(a => a.trim()).map(a => a.trim().toLowerCase());
    estadoAtual.proximoProfessor = document.getElementById('proximoProfessor').checked;
    estadoAtual.mesmaFileira = document.getElementById('mesmaFileira').checked;
}

function processarEmbaralhamento() {
    const { alunos, numSalas, numFileiras, numCarteiras, agrupamento, tamanhoGrupo, alunosEspeciais, mesmaFileira, regraTurma } = estadoAtual;

    let alunosEmbaralhados = [...alunos].sort(() => Math.random() - 0.5);

    // Aplicação das Regras de Turma
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

    // Filtragem de especiais (garantindo que fiquem no começo do array para preencher as primeiras carteiras)
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
        disciplina: estadoAtual.disciplina,
        data: new Date().toLocaleDateString('pt-BR'),
        totalAlunos: alunos.length,
        numSalas, numFileiras, numCarteiras, agrupamento, salas
    };
}

function criarGrupos(lista, tamanho, embaralharInterno) {
    if (embaralharInterno) {
        lista = [...lista].sort(() => Math.random() - 0.5);
    }
    const grupos = [];
    for (let i = 0; i < lista.length; i += tamanho) {
        grupos.push(lista.slice(i, i + tamanho));
    }
    return grupos;
}

function distribuirEmSalas(grupos, numSalas, numFileiras, numCarteiras, especiais) {
    const salas = Array.from({ length: numSalas }, () => []);
    let indiceGrupo = 0;

    for (let sala = 0; sala < numSalas; sala++) {
        for (let fileira = 0; fileira < numFileiras; fileira++) {
            for (let carteira = 0; carteira < numCarteiras; carteira++) {
                if (indiceGrupo < grupos.length) {
                    const grupo = grupos[indiceGrupo];
                    // Verifica se algum aluno do grupo atual está na lista de especiais
                    const proximoProfessor = especiais.some(e => grupo.some(g => g.nome === e.nome));
                    
                    salas[sala].push({
                        fileira, carteira, grupo, proximoProfessor
                    });
                    indiceGrupo++;
                }
            }
        }
    }
    return salas;
}

function exibirResultados(resultado) {
    const statsHtml = `
        <div class="stat-box"><div class="stat-label">Total de Alunos</div><div class="stat-value">${resultado.totalAlunos}</div></div>
        <div class="stat-box"><div class="stat-label">Salas Usadas</div><div class="stat-value">${resultado.numSalas}</div></div>
        <div class="stat-box"><div class="stat-label">Carteiras (Total Vagas)</div><div class="stat-value">${resultado.numSalas * resultado.numFileiras * resultado.numCarteiras}</div></div>
    `;
    document.getElementById('stats').innerHTML = statsHtml;
    desenharMapa(resultado);
    gerarListaDetalhada(resultado);
    document.getElementById('successMessage').textContent = `✅ Embaralhamento concluído! ${resultado.data}`;
    document.getElementById('successMessage').classList.add('show');
}

function desenharMapa(resultado) {
    const canvas = document.getElementById('mapCanvas');
    const ctx = canvas.getContext('2d');
    const SALA_LARGURA = 420;
    const SALA_ALTURA = 350;
    const MARGEM = 20;
    const PADDING = 40;

    const numSalasLinha = Math.ceil(Math.sqrt(resultado.numSalas));
    const numSalasColuna = Math.ceil(resultado.numSalas / numSalasLinha);

    canvas.width = numSalasLinha * (SALA_LARGURA + PADDING) + MARGEM * 2;
    canvas.height = numSalasColuna * (SALA_ALTURA + PADDING) + MARGEM * 2;

    ctx.fillStyle = '#f8f9fa';
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
    // Chão da Sala
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    ctx.fillRect(x, y, largura, altura);
    ctx.strokeRect(x, y, largura, altura);

    // Identificação da Sala
    ctx.fillStyle = '#334155';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`SALA ${numSala}`, x + 15, y + 25);

    // Lousa
    ctx.fillStyle = '#334155';
    ctx.fillRect(x + largura / 2 - 60, y + 10, 120, 15);
    ctx.fillStyle = '#ffffff';
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('LOUSA', x + largura / 2, y + 21);

    // Mesa do Professor
    ctx.fillStyle = '#d97706';
    ctx.fillRect(x + 15, y + 45, 45, 25);
    ctx.fillStyle = '#ffffff';
    ctx.font = '11px Arial';
    ctx.fillText('Prof.', x + 37, y + 62);

    const numCarteiras = resultado.numCarteiras;
    const numFileiras = resultado.numFileiras;
    
    // Área útil para os alunos
    const areaYStart = y + 80;
    const areaAltura = altura - 90;
    const espacoX = (largura - 30) / numCarteiras;
    const espacoY = areaAltura / numFileiras;
    
    const deskW = Math.min(espacoX * 0.85, 80);
    const deskH = Math.min(espacoY * 0.85, 45);

    for (let f = 0; f < numFileiras; f++) {
        for (let c = 0; c < numCarteiras; c++) {
            const px = x + 15 + c * espacoX + (espacoX - deskW) / 2;
            const py = areaYStart + f * espacoY + (espacoY - deskH) / 2;
            
            const carteiraAtual = carteirasOcupadas.find(cart => cart.fileira === f && cart.carteira === c);

            ctx.beginPath();
            if (ctx.roundRect) {
                ctx.roundRect(px, py, deskW, deskH, 4);
            } else {
                ctx.rect(px, py, deskW, deskH); // Fallback para navegadores antigos
            }

            if (carteiraAtual) {
                if (carteiraAtual.proximoProfessor) {
                    ctx.fillStyle = '#fef3c7'; ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 2;
                } else {
                    ctx.fillStyle = '#e0e7ff'; ctx.strokeStyle = '#667eea'; ctx.lineWidth = 1;
                }
                ctx.fill(); ctx.stroke();

                ctx.fillStyle = '#1e293b';
                ctx.font = 'bold 10px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                
                const stepY = 12;
                let startY = py + deskH / 2 - ((carteiraAtual.grupo.length - 1) * stepY) / 2;
                
                carteiraAtual.grupo.forEach(alunoObj => {
                    const parts = alunoObj.nome.split(' ');
                    const nomeCurto = parts[0] + (parts.length > 1 ? ' ' + parts[parts.length-1].charAt(0) + '.' : '');
                    ctx.fillText(nomeCurto, px + deskW / 2, startY);
                    startY += stepY;
                });
            } else {
                // Mesa vazia
                ctx.fillStyle = '#f8fafc'; ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1;
                ctx.fill(); ctx.stroke();
            }
        }
    }
}

function gerarListaDetalhada(resultado) {
    let html = '';
    resultado.salas.forEach((sala, indSala) => {
        html += `<div class="room-list"><div class="room-title">SALA ${indSala + 1}</div>`;
        sala.forEach((carteira, idx) => {
            const nomes = carteira.grupo.map(a => `<strong>${a.nome}</strong> (${a.turma})`).join(' + ');
            const proximoClass = carteira.proximoProfessor ? 'near-teacher' : '';
            html += `<div class="seat ${proximoClass}">
                <div class="seat-number">${idx + 1}</div>
                <div class="student-name">${nomes}</div>
                ${carteira.proximoProfessor ? '<div class="student-group">👨‍🏫 Frente</div>' : ''}
            </div>`;
        });
        html += '</div>';
    });
    document.getElementById('listContainer').innerHTML = html;
}

function mudarAba(abaNome, event) {
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    if(event) event.target.classList.add('active');
    document.getElementById(abaNome).classList.add('active');
}

function imprimirResultado() { window.print(); }

function exportarJSON() {
    const json = JSON.stringify(estadoAtual.resultado, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `embaralhamento-${estadoAtual.disciplina}-${new Date().getTime()}.json`;
    a.click();
}

function voltarFormulario() {
    document.getElementById('resultSection').classList.remove('active');
    document.getElementById('formSection').style.display = 'flex';
    document.getElementById('successMessage').classList.remove('show');
}

function limparFormulario() {
    document.getElementById('disciplina').value = '';
    document.getElementById('alunos').value = '';
    document.getElementById('alunosEspeciais').value = '';
    limparErro();
}

function mostrarErro(mensagem) {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.textContent = mensagem;
    errorDiv.classList.add('show');
}

function limparErro() {
    document.getElementById('errorMessage').classList.remove('show');
}
