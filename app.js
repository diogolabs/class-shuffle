let estadoAtual = {
    disciplina: '', numSalas: 2, numFileiras: 5, numCarteiras: 6,
    agrupamento: 'solo', tamanhoGrupo: 3, regraTurma: 'nenhuma',
    especiais: [], incompativeis: [], pcd: [], inseparaveis: [],
    resultado: null
};

let alunosCarregados = [];
let modalContext = ''; 
let selecaoEdicao = null; 

// --- CONTROLE DE FLUXO (ETAPAS 1 e 2) ---
function travarTurma() {
    const txt = document.getElementById('alunos').value.trim();
    if (!txt) return mostrarErro('A lista de alunos está vazia. Adicione os nomes.');
    
    alunosCarregados = txt.split('\n').filter(a => a.trim()).map(a => {
        let texto = a.trim();
        let nome = texto;
        let turma = 'Geral';
        const separador = texto.match(/(\s+-\s*|\s*-\s+|[–—,/;|])/);
        if (separador) {
            const partes = texto.split(separador[0]);
            turma = partes.pop().trim();
            nome = partes.join(separador[0]).trim();
        }
        return { id: nome.toLowerCase(), nome, turma, original: texto };
    });

    document.getElementById('lblTurmaTravada').textContent = `Turma (${alunosCarregados.length} alunos)`;
    document.getElementById('step1_carregar').classList.add('hidden');
    document.getElementById('step2_regras').classList.remove('hidden');
    document.getElementById('step2_regras').classList.add('flex');
    
    const btnGerar = document.getElementById('btnGerar');
    btnGerar.disabled = false;
    btnGerar.classList.remove('opacity-50', 'cursor-not-allowed');
    limparErro();
}

function destravarTurma() {
    document.getElementById('step2_regras').classList.add('hidden');
    document.getElementById('step2_regras').classList.remove('flex');
    document.getElementById('step1_carregar').classList.remove('hidden');
    document.getElementById('step1_carregar').classList.add('flex');
    
    const btnGerar = document.getElementById('btnGerar');
    btnGerar.disabled = true;
    btnGerar.classList.add('opacity-50', 'cursor-not-allowed');
    
    estadoAtual.especiais = []; estadoAtual.pcd = []; estadoAtual.incompativeis = []; estadoAtual.inseparaveis = [];
    selecaoEdicao = null;
    atualizarChipsUI();
}

// --- SISTEMA DE MODAL COM EXCLUSÃO MÚTUA ---
function abrirModal(tipo) {
    modalContext = tipo;
    const modal = document.getElementById('modalOverlay');
    const titulo = document.getElementById('modalTitle');
    const areaInseparaveis = document.getElementById('modalGruposInseparaveis');
    const footer = document.getElementById('modalFooter');
    
    document.getElementById('modalBusca').value = '';

    areaInseparaveis.classList.add('hidden');
    footer.classList.remove('hidden');

    if (tipo === 'especiais') titulo.innerHTML = '<span class="material-symbols-outlined text-secondary-container">visibility</span> Alunos na Frente';
    if (tipo === 'pcd') titulo.innerHTML = '<span class="material-symbols-outlined text-blue-400">accessible</span> Alunos PCD (Isolados)';
    if (tipo === 'incompativeis') titulo.innerHTML = '<span class="material-symbols-outlined text-error">front_hand</span> Separar Alunos';
    
    if (tipo === 'inseparaveis') {
        titulo.innerHTML = '<span class="material-symbols-outlined text-primary-container">link</span> Grupos Inseparáveis';
        areaInseparaveis.classList.remove('hidden');
        areaInseparaveis.classList.add('flex');
        footer.classList.add('hidden');
        renderizarGruposInseparaveis();
    }

    renderizarCheckboxesModal();
    modal.classList.remove('hidden');
}

function fecharModal() {
    document.getElementById('modalOverlay').classList.add('hidden');
    if(modalContext === 'inseparaveis') atualizarChipsUI();
}

function renderizarCheckboxesModal() {
    const container = document.getElementById('modalListaAlunos');
    const busca = document.getElementById('modalBusca').value.toLowerCase();
    const flatInseparaveis = estadoAtual.inseparaveis.flat();

    let html = '';
    alunosCarregados.forEach(aluno => {
        if (busca && !aluno.nome.toLowerCase().includes(busca)) return;
        
        let isChecked = false;
        let isDisabled = false;
        let reason = '';

        // REGRAS DE EXCLUSÃO (Frente não possui mais restrições)
        if (modalContext === 'pcd') {
            isChecked = estadoAtual.pcd.includes(aluno.id);
            if (!isChecked) {
                if (flatInseparaveis.includes(aluno.id)) { isDisabled = true; reason = '(Agrupado)'; }
                else if (estadoAtual.incompativeis.includes(aluno.id)) { isDisabled = true; reason = '(Incompatível)'; }
            }
        }
        else if (modalContext === 'especiais') {
            isChecked = estadoAtual.especiais.includes(aluno.id);
            // Sem disables: Todos podem sentar na frente.
        }
        else if (modalContext === 'incompativeis') {
            isChecked = estadoAtual.incompativeis.includes(aluno.id);
            if (!isChecked) {
                if (estadoAtual.pcd.includes(aluno.id)) { isDisabled = true; reason = '(PCD)'; }
                else if (flatInseparaveis.includes(aluno.id)) { isDisabled = true; reason = '(Inseparável)'; }
            }
        }
        else if (modalContext === 'inseparaveis') {
            isChecked = false;
            if (flatInseparaveis.includes(aluno.id)) { isDisabled = true; reason = '(Já agrupado)'; }
            else if (estadoAtual.pcd.includes(aluno.id)) { isDisabled = true; reason = '(PCD)'; }
            else if (estadoAtual.incompativeis.includes(aluno.id)) { isDisabled = true; reason = '(Incompatível)'; }
        }

        html += `
            <label class="flex items-center gap-3 p-2 rounded hover:bg-surface-variant cursor-pointer transition-colors ${isDisabled ? 'opacity-40 cursor-not-allowed' : ''}">
                <input type="checkbox" value="${aluno.id.replace(/"/g, '&quot;')}" class="form-checkbox text-primary-container bg-surface border-outline-variant focus:ring-0 rounded" 
                    ${isChecked ? 'checked' : ''} ${isDisabled ? 'disabled' : ''}>
                <span class="font-label-mono text-sm text-primary flex-1">${aluno.nome}</span>
                <span class="text-xs text-error font-label-mono">${reason}</span>
            </label>
        `;
    });
    container.innerHTML = html;
}

document.getElementById('modalBusca').addEventListener('input', renderizarCheckboxesModal);

function salvarModal() {
    const checkboxes = document.querySelectorAll('#modalListaAlunos input[type="checkbox"]');
    let selecionados = [];
    checkboxes.forEach(cb => { if (cb.checked && !cb.disabled) selecionados.push(cb.value); });
    
    if (modalContext !== 'inseparaveis') {
        estadoAtual[modalContext] = selecionados;
    }
    
    atualizarChipsUI();
    fecharModal();
}

function criarGrupoInseparavel() {
    const checkboxes = document.querySelectorAll('#modalListaAlunos input[type="checkbox"]');
    let selecionados = [];
    checkboxes.forEach(cb => { 
        if (cb.checked && !cb.disabled) {
            selecionados.push(cb.value);
            cb.checked = false; 
        }
    });

    if (selecionados.length < 2) return alert('Selecione pelo menos 2 alunos para formar um grupo inseparável.');
    
    estadoAtual.inseparaveis.push(selecionados);
    renderizarGruposInseparaveis();
    renderizarCheckboxesModal(); 
}

function excluirGrupoInseparavel(index) {
    estadoAtual.inseparaveis.splice(index, 1);
    renderizarGruposInseparaveis();
    renderizarCheckboxesModal();
}

function renderizarGruposInseparaveis() {
    const container = document.getElementById('listaGruposInseparaveis');
    if (estadoAtual.inseparaveis.length === 0) {
        container.innerHTML = '<span class="text-xs text-on-surface-variant font-label-mono italic">Nenhum grupo formado.</span>';
        return;
    }

    let html = '';
    estadoAtual.inseparaveis.forEach((grupo, idx) => {
        const nomes = grupo.map(id => alunosCarregados.find(a => a.id === id)?.nome || id).join(', ');
        html += `
            <div class="flex justify-between items-center bg-surface p-2 rounded border border-outline-variant">
                <span class="text-xs font-label-mono text-primary truncate flex-1">${nomes}</span>
                <button onclick="excluirGrupoInseparavel(${idx})" class="text-error ml-2 hover:opacity-70"><span class="material-symbols-outlined text-[16px]">delete</span></button>
            </div>
        `;
    });
    container.innerHTML = html;
}

function atualizarChipsUI() {
    const render = (tipo, corClass) => {
        const div = document.getElementById(`chips_${tipo}`);
        if (!div) return;
        
        let array = tipo === 'inseparaveis' ? estadoAtual.inseparaveis : estadoAtual[tipo];
        if (array.length === 0) { div.innerHTML = ''; return; }

        let html = '';
        if (tipo === 'inseparaveis') {
            array.forEach((grupo, idx) => {
                html += `<span class="border px-2 py-1 rounded text-[10px] font-label-mono ${corClass} flex items-center">Grupo ${idx+1} (${grupo.length})</span>`;
            });
        } else {
            array.forEach(id => {
                const nomeCurto = (alunosCarregados.find(a => a.id === id)?.nome || id).split(' ')[0];
                html += `<span class="border px-2 py-1 rounded text-[10px] font-label-mono ${corClass} flex items-center">${nomeCurto}</span>`;
            });
        }
        div.innerHTML = html;
    };

    render('especiais', 'bg-surface-variant text-primary border-outline-variant');
    render('pcd', 'bg-blue-900/30 text-blue-300 border-blue-500/50');
    render('incompativeis', 'bg-error/20 text-error border-error/50');
    render('inseparaveis', 'bg-primary-container/20 text-primary-container border-primary-container/50');
}

// --- MOTOR MATEMÁTICO ---
function embaralhar() {
    const erro = validarEntrada();
    if (erro) return mostrarErro(erro);
    
    limparErro();
    coletarDados();
    
    selecaoEdicao = null; 
    const resultado = processarEmbaralhamento();
    estadoAtual.resultado = resultado;
    
    exibirResultados(resultado);
    
    document.getElementById('formSection').style.display = 'none';
    document.getElementById('resultSection').classList.remove('hidden');
    document.getElementById('resultSection').style.display = 'flex';
}

function validarEntrada() {
    const discEl = document.getElementById('disciplina');
    if (!discEl || !discEl.value.trim()) return '❌ Por favor, preencha a disciplina';
    if (alunosCarregados.length === 0) return '❌ Turma não configurada. Carregue os alunos primeiro.';

    const numSalas = parseInt(document.getElementById('numSalas')?.value) || 1;
    const numFileiras = parseInt(document.getElementById('numFileiras')?.value) || 1;
    const numCarteiras = parseInt(document.getElementById('numCarteiras')?.value) || 1;
    
    let multiplicador = 1;
    const agrupamento = document.getElementById('agrupamento')?.value || 'solo';
    if (agrupamento === 'dupla') multiplicador = 2;
    if (agrupamento === 'grupo') multiplicador = parseInt(document.getElementById('tamanhoGrupo')?.value) || 3;

    const capacidadeTotal = numSalas * numFileiras * numCarteiras * multiplicador;
    
    if (alunosCarregados.length > capacidadeTotal) {
        return `❌ Não há espaço! Você tem ${alunosCarregados.length} alunos, mas apenas ${capacidadeTotal} vagas na configuração atual.`;
    }
    return null;
}

function coletarDados() {
    estadoAtual.disciplina = document.getElementById('disciplina').value.trim();
    estadoAtual.numSalas = parseInt(document.getElementById('numSalas').value) || 1;
    estadoAtual.numFileiras = parseInt(document.getElementById('numFileiras').value) || 1;
    estadoAtual.numCarteiras = parseInt(document.getElementById('numCarteiras').value) || 1;
    estadoAtual.agrupamento = document.getElementById('agrupamento').value || 'solo';
    estadoAtual.tamanhoGrupo = parseInt(document.getElementById('tamanhoGrupo').value) || 3;
    estadoAtual.regraTurma = document.getElementById('regraTurma').value || 'nenhuma';
}

function processarEmbaralhamento() {
    const { numSalas, numFileiras, numCarteiras, agrupamento, tamanhoGrupo, regraTurma } = estadoAtual;

    let alunos = [...alunosCarregados].sort(() => Math.random() - 0.5);

    if (regraTurma === 'agrupar') {
        alunos.sort((a, b) => a.turma.localeCompare(b.turma));
    } else if (regraTurma === 'separar') {
        const turmasHash = {};
        alunos.forEach(a => { if (!turmasHash[a.turma]) turmasHash[a.turma] = []; turmasHash[a.turma].push(a); });
        const chavesOrdenadas = Object.keys(turmasHash).sort((a, b) => turmasHash[b].length - turmasHash[a].length);
        const misturados = [];
        let temAluno = true;
        while(temAluno) {
            temAluno = false;
            for(let key of chavesOrdenadas) {
                if (turmasHash[key].length > 0) { misturados.push(turmasHash[key].shift()); temAluno = true; }
            }
        }
        alunos = misturados;
    }

    let chunks = [];
    let usedIds = new Set();
    
    alunos.forEach(a => {
        if (estadoAtual.pcd.includes(a.id)) {
            chunks.push([a]);
            usedIds.add(a.id);
        }
    });

    if (agrupamento !== 'solo') {
        estadoAtual.inseparaveis.forEach(grupoIds => {
            let chunk = [];
            grupoIds.forEach(idBusca => {
                let idx = alunos.findIndex(a => a.id === idBusca && !usedIds.has(a.id));
                if (idx !== -1) { chunk.push(alunos[idx]); usedIds.add(alunos[idx].id); }
            });
            if (chunk.length > 0) chunks.push(chunk);
        });
    }
    
    alunos.forEach(a => { if (!usedIds.has(a.id)) chunks.push([a]); });

    const isEspecial = (c) => c.some(a => estadoAtual.especiais.includes(a.id));
    const isIncompativel = (c) => c.some(a => estadoAtual.incompativeis.includes(a.id));
    const isPcd = (c) => c.some(a => estadoAtual.pcd.includes(a.id));
    
    let chunksEspeciais = chunks.filter(c => isEspecial(c));
    let chunksNormais = chunks.filter(c => !isEspecial(c));
    
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
    
    let finalEspeciais = mesclarEspacado(chunksEspeciais.filter(isIncompativel), chunksEspeciais.filter(c => !isIncompativel(c)));
    let finalNormais = mesclarEspacado(chunksNormais.filter(isIncompativel), chunksNormais.filter(c => !isIncompativel(c)));

    const tamanho = agrupamento === 'solo' ? 1 : (agrupamento === 'dupla' ? 2 : tamanhoGrupo);
    const numGruposFrente = numSalas * numFileiras;
    let gruposFrente = Array.from({ length: numGruposFrente }, () => []);
    let gruposGerais = [];
    
    const isDeskFull = (desk) => desk.length >= tamanho || isPcd(desk);
    const canFitChunk = (desk, chnk) => {
        if (isDeskFull(desk)) return false;
        if (desk.length + chnk.length > tamanho) return false;
        if (isPcd(chnk) && desk.length > 0) return false; // PCD precisa de mesa vazia
        return true;
    };

    let indexFrente = 0;
    while(finalEspeciais.length > 0) {
        let chunk = finalEspeciais.shift();
        let found = false;
        for(let i = 0; i < numGruposFrente; i++) {
            let idx = (indexFrente + i) % numGruposFrente;
            if (canFitChunk(gruposFrente[idx], chunk)) {
                gruposFrente[idx] = gruposFrente[idx].concat(chunk);
                indexFrente = idx + 1;
                found = true; break;
            }
        }
        if(!found) finalNormais.unshift(chunk);
    }
    
    for(let i = 0; i < numGruposFrente; i++) {
        while(!isDeskFull(gruposFrente[i]) && finalNormais.length > 0) {
            let chunk = finalNormais[0];
            if (isPcd(chunk) && gruposFrente[i].length > 0) break; 
            
            if (canFitChunk(gruposFrente[i], chunk)) {
                gruposFrente[i] = gruposFrente[i].concat(finalNormais.shift());
            } else {
                let fitIdx = finalNormais.findIndex(c => canFitChunk(gruposFrente[i], c));
                if (fitIdx !== -1) {
                    gruposFrente[i] = gruposFrente[i].concat(finalNormais.splice(fitIdx, 1)[0]);
                } else {
                    let isInsep = chunk.some(a => estadoAtual.inseparaveis.flat().includes(a.id));
                    if(!isPcd(chunk) && !isInsep) {
                        let space = tamanho - gruposFrente[i].length;
                        gruposFrente[i] = gruposFrente[i].concat(finalNormais[0].splice(0, space));
                        if (finalNormais[0].length === 0) finalNormais.shift();
                    }
                    break;
                }
            }
        }
        if (gruposFrente[i].length > 0) gruposGerais.push(gruposFrente[i]);
    }
    
    let currentDesk = [];
    while(finalNormais.length > 0) {
        let chunk = finalNormais[0];
        
        if (isPcd(chunk)) {
            if (currentDesk.length > 0) gruposGerais.push(currentDesk);
            gruposGerais.push(finalNormais.shift());
            currentDesk = [];
            continue;
        }

        if (canFitChunk(currentDesk, chunk)) {
            currentDesk = currentDesk.concat(finalNormais.shift());
            if (isDeskFull(currentDesk)) {
                gruposGerais.push(currentDesk);
                currentDesk = [];
            }
        } else {
            let fitIdx = finalNormais.findIndex(c => canFitChunk(currentDesk, c));
            if (fitIdx !== -1) {
                currentDesk = currentDesk.concat(finalNormais.splice(fitIdx, 1)[0]);
                if (isDeskFull(currentDesk)) {
                    gruposGerais.push(currentDesk);
                    currentDesk = [];
                }
            } else {
                let isInsep = chunk.some(a => estadoAtual.inseparaveis.flat().includes(a.id));
                if(!isPcd(chunk) && !isInsep) {
                    let space = tamanho - currentDesk.length;
                    currentDesk = currentDesk.concat(finalNormais[0].splice(0, space));
                    if (finalNormais[0].length === 0) finalNormais.shift();
                } else {
                    gruposGerais.push(currentDesk);
                    currentDesk = [];
                    currentDesk = currentDesk.concat(finalNormais.shift());
                }
                
                if (isDeskFull(currentDesk)) {
                    gruposGerais.push(currentDesk);
                    currentDesk = [];
                }
            }
        }
    }
    if (currentDesk.length > 0) gruposGerais.push(currentDesk);
    
    const salas = distribuirEmSalas(gruposGerais, numSalas, numFileiras, numCarteiras);

    return {
        disciplina: estadoAtual.disciplina, data: new Date().toLocaleDateString('pt-BR'),
        totalAlunos: alunosCarregados.length, numSalas, numFileiras, numCarteiras, agrupamento, salas
    };
}

function distribuirEmSalas(grupos, numSalas, numFileiras, numCarteiras) {
    const salas = Array.from({ length: numSalas }, () => []);
    const assentosPorSala = Array(numSalas).fill(0);

    grupos.forEach((grupo, index) => {
        const salaAtual = index % numSalas;
        const assentoIndex = assentosPorSala[salaAtual];
        const fileira = assentoIndex % numFileiras; 
        const carteira = Math.floor(assentoIndex / numFileiras); 

        if (carteira < numCarteiras) { 
            const proximoProfessor = grupo.some(g => estadoAtual.especiais.includes(g.id));
            const temPcd = grupo.some(g => estadoAtual.pcd.includes(g.id));
            salas[salaAtual].push({ fileira, carteira, grupo, proximoProfessor, temPcd });
            assentosPorSala[salaAtual]++;
        }
    });
    return salas;
}

// --- LÓGICA DE EDIÇÃO MANUAL ---
function tratarCliqueMesa(salaIndex, fileira, carteira) {
    if (!estadoAtual.resultado) return;

    if (!selecaoEdicao) {
        const cart = estadoAtual.resultado.salas[salaIndex].find(c => c.fileira === fileira && c.carteira === carteira);
        if (!cart) return; 
        
        selecaoEdicao = { salaIndex, fileira, carteira };
        desenharMapa(estadoAtual.resultado); 
    } else {
        const sO = selecaoEdicao.salaIndex;
        const fO = selecaoEdicao.fileira;
        const cO = selecaoEdicao.carteira;
        
        const sD = salaIndex;
        const fD = fileira;
        const cD = carteira;

        if (sO === sD && fO === fD && cO === cD) {
            selecaoEdicao = null;
            desenharMapa(estadoAtual.resultado);
            return;
        }

        let arrO = estadoAtual.resultado.salas[sO];
        let arrD = estadoAtual.resultado.salas[sD];
        
        let idxO = arrO.findIndex(c => c.fileira === fO && c.carteira === cO);
        let idxD = arrD.findIndex(c => c.fileira === fD && c.carteira === cD);

        if (idxO !== -1 && idxD !== -1) {
            let tempG = arrO[idxO].grupo;
            arrO[idxO].grupo = arrD[idxD].grupo;
            arrD[idxD].grupo = tempG;

            // Recalcula tags baseado no novo grupo da mesa
            arrO[idxO].proximoProfessor = arrO[idxO].grupo.some(g => estadoAtual.especiais.includes(g.id));
            arrO[idxO].temPcd = arrO[idxO].grupo.some(g => estadoAtual.pcd.includes(g.id));
            arrD[idxD].proximoProfessor = arrD[idxD].grupo.some(g => estadoAtual.especiais.includes(g.id));
            arrD[idxD].temPcd = arrD[idxD].grupo.some(g => estadoAtual.pcd.includes(g.id));
            
        } else if (idxO !== -1 && idxD === -1) {
            let movido = arrO.splice(idxO, 1)[0];
            movido.fileira = fD;
            movido.carteira = cD;
            arrD.push(movido);
        }

        selecaoEdicao = null;
        desenharMapa(estadoAtual.resultado);
        gerarListaDetalhada(estadoAtual.resultado);
    }
}

// --- RENDERIZAÇÃO E EXPORTAÇÃO ---
function exibirResultados(resultado) {
    const st = document.getElementById('stats');
    st.innerHTML = `
        <div class="bg-white p-4 rounded border border-gray-200 text-center shadow-sm"><span class="text-gray-500 text-xs font-label-mono block">TOTAL ALUNOS</span><span class="font-headline-lg">${resultado.totalAlunos}</span></div>
        <div class="bg-white p-4 rounded border border-gray-200 text-center shadow-sm"><span class="text-gray-500 text-xs font-label-mono block">SALAS USADAS</span><span class="font-headline-lg">${resultado.numSalas}</span></div>
        <div class="bg-white p-4 rounded border border-gray-200 text-center shadow-sm"><span class="text-gray-500 text-xs font-label-mono block">VAGAS TOTAIS</span><span class="font-headline-lg text-blue-600">${resultado.numSalas * resultado.numFileiras * resultado.numCarteiras}</span></div>
    `;
    
    desenharMapa(resultado);
    gerarListaDetalhada(resultado);
    
    const sucEl = document.getElementById('successMessage');
    sucEl.innerHTML = `<span class="material-symbols-outlined align-middle mr-2">check_circle</span> Mapeamento concluído! Clique em um aluno no mapa para trocar de lugar.`;
    sucEl.classList.remove('hidden');
}

function desenharMapa(resultado) {
    const container = document.getElementById('mapa');
    container.innerHTML = ''; 
    const SALA_LARGURA = 420; const SALA_ALTURA = 350; const MARGEM = 20;

    resultado.salas.forEach((sala, indSala) => {
        const card = document.createElement('div');
        card.className = 'bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col items-center gap-4 cursor-pointer';
        card.title = "Clique em um aluno para selecioná-lo e depois em outra mesa para trocar.";

        const canvas = document.createElement('canvas');
        canvas.width = SALA_LARGURA + (MARGEM * 2);
        canvas.height = SALA_ALTURA + (MARGEM * 2);
        canvas.className = 'rounded border border-gray-100 hover:shadow-md transition-shadow';
        
        canvas.addEventListener('click', function(e) {
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            const cx = (e.clientX - rect.left) * scaleX;
            const cy = (e.clientY - rect.top) * scaleY;

            const startX = MARGEM + 15;
            const startY = MARGEM + 80;
            
            if (cx < startX || cy < startY || cx > MARGEM + SALA_LARGURA - 15 || cy > MARGEM + SALA_ALTURA - 10) {
                if (selecaoEdicao) { selecaoEdicao = null; desenharMapa(estadoAtual.resultado); }
                return;
            }

            const espX = (SALA_LARGURA - 30) / resultado.numFileiras;
            const espY = (SALA_ALTURA - 90) / resultado.numCarteiras;

            const coluna = Math.floor((cx - startX) / espX);
            const linha = Math.floor((cy - startY) / espY);

            if (coluna >= 0 && coluna < resultado.numFileiras && linha >= 0 && linha < resultado.numCarteiras) {
                tratarCliqueMesa(indSala, coluna, linha);
            }
        });

        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        desenharSala(ctx, MARGEM, MARGEM, SALA_LARGURA, SALA_ALTURA, sala, indSala + 1, resultado, indSala);

        const btn = document.createElement('button');
        btn.className = 'w-full py-2 rounded font-label-mono flex items-center justify-center gap-2 bg-blue-50 border border-blue-300 text-blue-700 text-sm hover:bg-blue-100 transition-colors';
        btn.innerHTML = `<span class="material-symbols-outlined text-[18px]">image</span> EXPORTAR SALA ${indSala + 1}`;
        btn.onclick = (e) => { e.stopPropagation(); exportarMapaPNG(sala, indSala + 1, resultado, indSala); };

        card.appendChild(canvas);
        card.appendChild(btn);
        container.appendChild(card);
    });
}

function desenharSala(ctx, x, y, largura, altura, carteirasOcupadas, numSala, resultado, salaIndex) {
    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#9ca3af'; ctx.lineWidth = 2;
    ctx.fillRect(x, y, largura, altura); ctx.strokeRect(x, y, largura, altura);
    
    ctx.fillStyle = '#111827'; ctx.font = 'bold 16px Courier Prime, monospace'; ctx.textAlign = 'left';
    ctx.fillText(`SALA ${numSala}`, x + 15, y + 25);
    
    ctx.fillStyle = '#e5e7eb'; ctx.fillRect(x + largura / 2 - 60, y + 10, 120, 15);
    ctx.fillStyle = '#374151'; ctx.font = '10px Courier Prime, monospace'; ctx.textAlign = 'center';
    ctx.fillText('LOUSA', x + largura / 2, y + 21);
    
    ctx.fillStyle = '#fef08a'; ctx.fillRect(x + 15, y + 45, 45, 25);
    ctx.fillStyle = '#854d0e'; ctx.font = 'bold 11px Courier Prime, monospace'; ctx.fillText('Prof.', x + 37, y + 62);

    const espX = (largura - 30) / resultado.numFileiras; 
    const espY = (altura - 90) / resultado.numCarteiras; 
    const deskW = Math.min(espX * 0.85, 80); 
    const deskH = Math.min(espY * 0.85, 45);

    for (let l = 0; l < resultado.numCarteiras; l++) {
        for (let c = 0; c < resultado.numFileiras; c++) {
            const px = x + 15 + c * espX + (espX - deskW) / 2;
            const py = y + 80 + l * espY + (espY - deskH) / 2;
            const cart = carteirasOcupadas.find(cart => cart.fileira === c && cart.carteira === l);

            ctx.beginPath();
            if (ctx.roundRect) ctx.roundRect(px, py, deskW, deskH, 4);
            else ctx.rect(px, py, deskW, deskH);

            if (cart) {
                if (cart.temPcd) {
                    ctx.fillStyle = '#dbeafe'; ctx.strokeStyle = '#2563eb'; ctx.lineWidth = 2;
                } else if (cart.proximoProfessor) {
                    ctx.fillStyle = '#fef3c7'; ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 2;
                } else {
                    ctx.fillStyle = '#f3f4f6'; ctx.strokeStyle = '#9ca3af'; ctx.lineWidth = 1;
                }
                ctx.fill(); ctx.stroke();
                
                ctx.fillStyle = '#111827'; ctx.font = 'bold 10px Courier Prime, monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                const step = 12;
                const totalLines = cart.grupo.length + (cart.temPcd ? 1 : 0);
                let sY = py + deskH / 2 - ((totalLines - 1) * step) / 2;
                
                cart.grupo.forEach(a => {
                    const p = a.nome.split(' ');
                    let nomeCurto = p[0] + (p.length > 1 ? ' ' + p[p.length-1].charAt(0) + '.' : '');
                    ctx.fillText(nomeCurto, px + deskW / 2, sY);
                    sY += step;
                    
                    // Adiciona a TAG [+ Auxiliar] logo abaixo do nome do aluno caso ele seja PCD
                    if (estadoAtual.pcd.includes(a.id)) {
                        ctx.fillStyle = '#2563eb';
                        ctx.fillText('[+ Auxiliar]', px + deskW / 2, sY);
                        ctx.fillStyle = '#111827';
                        sY += step;
                    }
                });
            } else {
                ctx.fillStyle = '#f9fafb'; ctx.strokeStyle = '#d1d5db'; ctx.lineWidth = 1;
                ctx.fill(); ctx.stroke();
            }

            if (selecaoEdicao && selecaoEdicao.salaIndex === salaIndex && selecaoEdicao.fileira === c && selecaoEdicao.carteira === l) {
                ctx.beginPath();
                if (ctx.roundRect) ctx.roundRect(px - 2, py - 2, deskW + 4, deskH + 4, 6);
                else ctx.rect(px - 2, py - 2, deskW + 4, deskH + 4);
                
                ctx.strokeStyle = '#f59e0b'; 
                ctx.lineWidth = 3;
                ctx.setLineDash([5, 5]);
                ctx.stroke();
                ctx.setLineDash([]); 
            }
        }
    }
}

function exportarMapaPNG(sala, numSala, resultado, salaIndex) {
    const TEMP_SELECAO = selecaoEdicao;
    selecaoEdicao = null; 

    const SCALE = 4;
    const SALA_LARGURA = 420; const SALA_ALTURA = 350; const MARGEM = 20;
    
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = (SALA_LARGURA + MARGEM * 2) * SCALE;
    tempCanvas.height = (SALA_ALTURA + MARGEM * 2) * SCALE;
    
    const ctx = tempCanvas.getContext('2d');
    ctx.scale(SCALE, SCALE);
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, tempCanvas.width / SCALE, tempCanvas.height / SCALE);
    
    desenharSala(ctx, MARGEM, MARGEM, SALA_LARGURA, SALA_ALTURA, sala, numSala, resultado, salaIndex);
    
    const a = document.createElement('a');
    a.href = tempCanvas.toDataURL('image/png');
    a.download = `SALA-${numSala}-${estadoAtual.disciplina || 'mapeamento'}-alta-res.png`;
    document.body.appendChild(a); 
    a.click();
    document.body.removeChild(a);

    selecaoEdicao = TEMP_SELECAO; 
}

function gerarListaDetalhada(resultado) {
    let html = '';
    resultado.salas.forEach((sala, indSala) => {
        html += `<div class="mb-6"><div class="font-headline-lg-mobile text-black mb-3 border-b pb-2">SALA ${indSala + 1}</div>`;
        sala.forEach((cart, idx) => {
            const nomes = cart.grupo.map(a => {
                let tagAux = estadoAtual.pcd.includes(a.id) ? ` <span class="text-blue-600 text-[10px] font-bold uppercase tracking-wider">[+ Auxiliar]</span>` : '';
                return `<strong class="text-black">${a.nome}</strong>${tagAux} <span class="text-gray-500 text-xs">(${a.turma})</span>`;
            }).join(' + ');
            
            let style = 'bg-white';
            let tag = '';
            if(cart.temPcd) { style = 'border-l-4 border-blue-500 bg-blue-50'; tag = '<span class="text-xs text-blue-700 font-bold tracking-widest">PCD/Solo</span>'; }
            else if(cart.proximoProfessor) { style = 'border-l-4 border-amber-500 bg-amber-50'; tag = '<span class="text-xs text-amber-700 font-bold tracking-widest">Frente</span>'; }
            
            html += `<div class="p-3 mb-2 rounded border border-gray-300 flex items-center gap-4 ${style}">
                <div class="bg-gray-200 text-gray-800 px-3 py-1 rounded text-sm font-bold">${idx + 1}</div>
                <div class="flex-1 text-sm font-body-md">${nomes}</div>
                ${tag}
            </div>`;
        });
        html += '</div>';
    });
    document.getElementById('listContainer').innerHTML = html;
}

function mudarAba(aba, ev) {
    document.querySelectorAll('.tab-button').forEach(b => { b.classList.remove('bg-white', 'text-black', 'shadow-sm', 'active'); b.classList.add('text-gray-600'); });
    document.querySelectorAll('.tab-content').forEach(c => { c.classList.add('hidden'); c.classList.remove('active'); });
    if(ev) { ev.target.classList.add('bg-white', 'text-black', 'shadow-sm', 'active'); ev.target.classList.remove('text-gray-600'); }
    const el = document.getElementById(aba);
    if(el) { el.classList.remove('hidden'); el.classList.add('active'); }
}

function imprimirResultado() { window.print(); }

function exportarJSON() {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(estadoAtual.resultado, null, 2)], { type: 'application/json' }));
    a.download = `mapeamento-${estadoAtual.disciplina}-${new Date().getTime()}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
}

function voltarFormulario() {
    document.getElementById('resultSection').classList.add('hidden');
    document.getElementById('resultSection').style.display = 'none';
    document.getElementById('formSection').style.display = 'flex';
}

function limparFormulario() {
    document.getElementById('disciplina').value = '';
    document.getElementById('alunos').value = '';
    destravarTurma();
    limparErro();
}

function mostrarErro(m) { 
    const e = document.getElementById('errorMessage');
    e.textContent = m; 
    e.classList.remove('hidden'); 
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function limparErro() { 
    document.getElementById('errorMessage').classList.add('hidden'); 
}

function processarCSV(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        const linhas = e.target.result.split('\n');
        const sep = e.target.result.includes(';') ? ';' : ',';
        let res = '';
        for (let i = (linhas[0].toLowerCase().includes('nome') ? 1 : 0); i < linhas.length; i++) {
            if (!linhas[i].trim()) continue;
            const col = linhas[i].split(sep);
            if (col[0]) res += col[1] ? `${col[0].trim().replace(/["']/g, '')} - ${col[1].trim().replace(/["']/g, '')}\n` : `${col[0].trim().replace(/["']/g, '')}\n`;
        }
        document.getElementById('alunos').value = res.trim();
        document.getElementById('csvInput').value = ''; 
    };
    reader.readAsText(file, 'ISO-8859-1');
}
