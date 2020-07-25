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
/**
 * Math.floor retira a parte flutuante.
 * Math.random varia as posições da comida no cenário do jogo.
*/
let food = {
    x: Math.floor(Math.random() * 15 + 1) * box,
    y: Math.floor(Math.random() * 15 + 1) * box
}

// Criando a função do Background.
function criarBG(){
    // Definindo a cor. | fillstyle trabalha com o estilo do canvas.
    context.fillStyle = "lightgreen";
    // Desenha onde vai acontecer o jogo e trabalha com 4 parâmetros.
    context.fillRect(0, 0, 16 * box, 16 * box);
}

// Função responsável pela a criação da cobrinha.
function criarCobrinha(){
    // for vai percorrer todo o tamanho do array e vai incrementar.
    for(i=0; i < snake.length; i++){
        // Definindo a cor.
        context.fillStyle = "green";
        // Passando o tamanho.
        context.fillRect(snake[i].x, snake[i].y, box, box);
    } // Fecha for
} // Fecha função criarCobrinha

// Função responsável pela a criação da comida.
function drawFood(){
    // Definindo a cor da comida.
    context.fillStyle = "red";
    // Passando as posições quando o fillRect ir desenhar.
    context.fillRect(food.x, food.y, box, box)
}

// Evento de clique vai pegar a tecla e dar update.
document.addEventListener('keydown', update);

// Informando o código da tecla e criando a regra que não pode ser na direção oposta.
function update (event){
    if(event.keyCode == 37 && direction != "right") direction = "left";
    if(event.keyCode == 38 && direction != "down") direction = "up";
    if(event.keyCode == 39 && direction != "left") direction = "right";
    if(event.keyCode == 40 && direction != "up") direction = "down";
}

// Função que carrega partes do jogo.
function iniciarJogo(){
    /**
     * Criando a regra de ultrapassagem da tela(cenário) para voltar ao ponto incial.
     * Impedindo que a cobrinha suma!
    */
    if(snake[0].x > 15 * box && direction == "right") snake[0].x = 0;
    if(snake[0].x < 0 && direction == "left") snake[0].x = 16 * box;
    if(snake[0].y > 15 * box && direction == "down") snake[0].y = 0;
    if(snake[0].y < 0 && direction == "up") snake[0].y = 16 * box;

    // Carrega as funções.
    criarBG();
    criarCobrinha();
    drawFood();

    let snakeX = snake[0].x;
    let snakeY = snake[0].y;

    /** Coordenadas 
     * Exemplo: Se a cobrinha ir para o lado direito, adiciona um quadrado, 
     * caso vá para esquerda, diminue um quadrado.
    */
    if(direction == "right") snakeX += box;
    if(direction == "left") snakeX -= box;
    if(direction == "up") snakeY -= box;
    if(direction == "down") snakeY += box;

    /**
     * Condição - Cobrinha comendo a comida.
     * Caso as posições da cobrinha e comida sejam diferentes, retira o último elemento.
     * Se não, ela aumenta e comida surge novamente aleatoriamente.
     */
    if(snakeX != food.x || snakeY != food.y){
        // Retirando o último elemento do array.
        snake.pop();
    }else{food.x = Math.floor(Math.random() * 15 + 1) * box;
        food.y = Math.floor(Math.random() * 15 + 1) * box;
    }

    let newHead = {
        x: snakeX,
        y: snakeY
    }

    // Unshift - Acrescentando um elemento sempre na frente.
    snake.unshift(newHead);
}

// A cada 100 milisegundos o iniciarJogo vai estar sendo renovado caso trave. 
let jogo = setInterval(iniciarJogo, 100);

