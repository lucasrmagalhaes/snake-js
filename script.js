// Carregando o snake com uma variável chamada "canvas".
let canvas = document.getElementById("snake");
// Contexto é a reinderização do Canvas que vai trabalhar com um plano 2D.
let context = canvas.getContext("2d"); 
// 32 pixels cada quadrado.
let box = 32;
let snake = []; // Criando um array.

// Passando o que vai ter dentro do array.
snake[0] = { // Definindo a posição.
    x: 8 * box, // Dando um tamanho.
    y: 8 * box
}

// Variável responsável pela a direção.
let direction = "right";

// Criando a função do Background.
function criarBG(){
    // Definindo a cor. | fillstyle trabalha com o estilo do canvas.
    context.fillStyle = "lightgreen";
    // Desenha onde vai acontecer o jogo e trabalha com 4 parâmetros.
    context.fillRect(0, 0, 16 * box, 16 * box);
}


function criarCobrinha(){
    // for vai percorrer todo o tamanho do array e vai incrementar.
    for(i=0; i < snake.length; i++){
        // Definindo a cor.
        context.fillStyle = "green";
        // Passando o tamanho.
        context.fillRect(snake[i].x, snake[i].y, box, box);
    }
}

function iniciarJogo(){
    criarBG();
    criarCobrinha();

    let snakeX = snake[0].x;
    let snakeY = snake[0].y;

    /** Coordenadas 
        Exemplo: Se a cobrinha ir para o lado direito, adiciona um quadrado, 
    caso vá para esquerda, diminue um quadrado.
    */
    if(direction == "right") snakeX += box;
    if(direction == "left") snakeX -= box;
    if(direction == "up") snakeY -= box;
    if(direction == "down") snakeY += box;

    // Retirando o último elemento do array.
    snake.pop();

    let newHead = {
        x: snakeX,
        y: snakeY
    }

    // Unshift - Acrescentando um elemento sempre na frente.
    snake.unshift(newHead);
}

// A cada 100 milisegundos o iniciarJogo vai estar sendo renovado caso trave. 
let jogo = setInterval(iniciarJogo, 100);

