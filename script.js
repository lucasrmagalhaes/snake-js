// Carregando o snake com uma variável chamada "canvas".
let canvas = document.getElementById("snake");
// Contexto é a reinderização do Canvas que vai trabalhar com um plano 2D.
let context = canvas.getContext("2d"); 
// 32 pixels cada quadrado.
let box = 32;

// Criando a função do Background.
function criarBG(){
    // Definindo a cor. | fillstyle trabalha com o estilo do canvas.
    context.fillStyle = "lightgreen";
    // Desenha onde vai acontecer o jogo e trabalha com 4 parâmetros.
    context.fillRect(0, 0, 16 * box, 16 * box);
}

criarBG();

