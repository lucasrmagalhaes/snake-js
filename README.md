<h1 align="center">SNAKE :snake:</h1>

<p align="center">
  <a href="https://lucasrmagalhaes.github.io/snake-js/">
    <img 
         src="https://github.com/lucasrmagalhaes/snake-js/blob/master/img/snake.png?raw=true" 
         alt="Snake Game" 
    />
  </a>
  <br />
  <i>Nostálgico jogo da cobrinha desenvolvido em JavaScript.</i>
  <br />
  <br />
  <a href="https://lucasrmagalhaes.github.io/snake-js/"><strong>▶ Jogar online</strong></a>
</p>

<hr />

<details>

  <summary><strong>Como jogar</strong></summary>

  <br />

  <ul>
    <li><strong>Setas</strong> ou <strong>WASD</strong> — mover a cobrinha;</li>
    <li><strong>Espaço</strong> ou <strong>Enter</strong> — começar / reiniciar;</li>
    <li><strong>Espaço</strong> ou <strong>P</strong> — pausar e retomar;</li>
    <li><strong>L</strong> — abrir/fechar o ranking global; e</li>
    <li><strong>Swipe</strong> na tela — controles em dispositivos móveis.</li>
  </ul>

</details>

<hr />

<details>

  <summary><strong>Rodando localmente</strong></summary>

  <br />

  <p>O jogo usa módulos ES, então precisa ser servido via HTTP — abrir o <code>index.html</code> direto do disco (<code>file://</code>) não funciona:</p>

<pre><code>git clone https://github.com/lucasrmagalhaes/snake-js.git
cd snake-js
npx serve .
# ou: python -m http.server 8000</code></pre>

  <p>Depois é só abrir a URL indicada no terminal (ex.: <code>http://localhost:3000</code>).</p>

</details>

<hr />

<details>

  <summary><strong>Ranking e segurança (Firestore)</strong></summary>

  <br />

  <p>O ranking global grava os scores em um Firestore via REST (<code>js/leaderboard.js</code>), direto do navegador. Isso significa que <strong>sem Security Rules o banco aceita escrita de qualquer origem</strong>: qualquer pessoa com a URL do projeto consegue inserir um score arbitrário (ex.: <code>999999</code>), editar ou apagar documentos — a API key do Firebase não é segredo e não protege nada sozinha.</p>

  <p>O arquivo <a href="firestore.rules"><code>firestore.rules</code></a> na raiz do repositório mitiga isso validando o formato exato que o jogo envia:</p>

  <ul>
    <li><code>name</code> — string de 1 a 20 caracteres;</li>
    <li><code>score</code> — inteiro entre 0 e 2000 (teto folgado sobre o máximo teórico de gameplay, ~1625 no tabuleiro 25×13);</li>
    <li><code>ts</code> — timestamp;</li>
    <li>nenhum campo extra, e <strong>sem update/delete público</strong> — só criação e leitura.</li>
  </ul>

  <p><strong>⚠️ As rules não se aplicam sozinhas</strong> — precisam de deploy manual no projeto Firebase (passo do dono do projeto):</p>

  <ul>
    <li><strong>Console:</strong> <a href="https://console.firebase.google.com/">Firebase Console</a> → Firestore Database → aba <em>Regras</em> → colar o conteúdo de <code>firestore.rules</code> → <em>Publicar</em>; ou</li>
    <li><strong>CLI:</strong> <code>firebase deploy --only firestore:rules</code> (com o <a href="https://firebase.google.com/docs/cli">Firebase CLI</a> autenticado e o arquivo referenciado no <code>firebase.json</code>).</li>
  </ul>

  <p>As rules validam <em>formato</em>, não <em>legitimidade</em>: um script ainda pode enviar um score falso desde que passe na validação. Para reforçar, ative o <a href="https://firebase.google.com/docs/app-check">Firebase App Check</a>, que exige um atestado (ex.: reCAPTCHA) de que a requisição vem do app web real antes de aceitar a escrita.</p>

</details>

<hr />

<details>
  
  <summary><strong>Updates</strong></summary>
  
  <br />
  
  <ol>
    <li>Alterado a cor de background;</li>
    <li>Adicionado espaçamento entre os quadrados da cobrinha;</li>
    <li>Fix pelo <a href="https://github.com/roanrobersson">@roanrobersson</a> - Cobrinha deixou de sumir durante teletransporte + keydown; e</li>
    <li>Feat pelo <a href="https://github.com/Jorgewlf88">@Jorgewlf88</a> - Suporte para dispositivos móveis.</li>
    <li>Feat pelo <a href="https://github.com/MaurerKrisztian">@MaurerKrisztian</a> - Adicionado configuração de velocidade e pontuação.</li>
    <li>Score real, high score persistido em <code>localStorage</code> e tela de Game Over no canvas (sem <code>alert</code>).</li>
    <li>Tela inicial com instruções, pausa (Space/P) e suporte a WASD além das setas.</li>
    <li>Visual repaginado: cabeça com olhos direcionais, segmentos arredondados, grid sutil, comida com gradiente e pulsação.</li>
    <li>Comida especial dourada (+5 pontos, tempo limitado, com anel de timer).</li>
    <li>Aceleração progressiva conforme o score sobe.</li>
    <li>Modo "paredes mortais" opcional (toggle), com borda vermelha indicando o modo ativo.</li>
    <li>Sons via Web Audio API (eat, special, game over) com toggle de mute.</li>
    <li>Presets de dificuldade: Easy, Normal e Hard.</li>
    <li>6 personagens de cobra selecionáveis: <strong>Verdão</strong>, <strong>Coral</strong>, <strong>Jararaca</strong>, <strong>Píton</strong>, <strong>Naja</strong> e <strong>Brasa</strong>.</li>
    <li>Canvas widescreen 25×13 (proporção ~16:9), responsivo em mobile e modo fullscreen.</li>
    <li>Favicon SVG temático.</li>
    <li>Colisão justa com a cauda, comida nunca nasce sob a cabeça, teclas do jogo não rolam mais a página, swipe corrigido no mobile e cache do PWA com atualização automática.</li>
  </ol>

</details>

<hr />

<details>
  
  <summary><strong>Fonte</strong></summary>
  
  <br />
  
  <p align="left">
    Plataforma: <a href="https://www.dio.me">Digital Innovation One</a> <br /> 
    Desafio: Recriando o Jogo da Cobrinha com JavaScript
  </p>
  
</details>

<hr />

<h4>Contribuidores</h4>

<table>
  <tr>
    <td align="center">
        <a href="https://github.com/roanrobersson">
          <img src="https://avatars.githubusercontent.com/u/31264496?v=4" width="100px;"/><br><sub><b>Roan de Oliveira</b></sub>
      </a>
    </td>
    <td align="center">
      <a href="https://github.com/Jorgewlf88">
        <img src="https://avatars.githubusercontent.com/u/5809383?v=4" width="100px;"/><br><sub><b>Jorge Ortega Pereira</b></sub>
      </a>
    </td>
    <td align="center">
      <a href="https://github.com/MaurerKrisztian">
        <img src="https://avatars.githubusercontent.com/u/48491140?v=4" width="100px;"/><br><sub><b>Maurer Krisztian</b></sub>
      </a>
    </td>
  </tr>
  <tr>
    <td colspan="3"></td>
  </tr>
  <tr>
    <td colspan="3">
        <a href="https://github.com/lucasrmagalhaes/snake-js/issues">
          <img src="https://img.shields.io/github/issues/lucasrmagalhaes/snake-js?style=plastic" /> 
        </a>
        <a href="https://github.com/lucasrmagalhaes/snake-js/network/members">
          <img src="https://img.shields.io/github/forks/lucasrmagalhaes/snake-js?style=plastic" /> 
        </a>
        <a href="https://github.com/lucasrmagalhaes/snake-js/stargazers">
          <img src="https://img.shields.io/github/stars/lucasrmagalhaes/snake-js?style=plastic" /> 
        </a>
         <a href="https://github.com/lucasrmagalhaes/snake-js/blob/master/LICENSE">
          <img src="https://img.shields.io/github/license/lucasrmagalhaes/snake-js?style=plastic" /> 
        </a>
        <a href="https://github.com/lucasrmagalhaes/snake-js/deployments">
          <img src="https://img.shields.io/github/deployments/lucasrmagalhaes/snake-js/github-pages?style=plastic" />
        </a>
    </td>
  </tr>
</table>
