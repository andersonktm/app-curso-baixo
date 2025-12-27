// Banco de dados das músicas extraído das imagens fornecidas
const intervalSongsData = [
    {
        interval: "Segunda Menor",
        semitones: "1 semitom",
        ascending: [
            { title: "Isn't She Lovely", artist: "Stevie Wonder" },
            { title: "A Hard Day's Night", artist: "The Beatles" }
        ],
        descending: [
            { title: "For Whom the Bell Tolls", artist: "Metallica" },
            { title: "Jurassik Park Theme", artist: "John Williams" }
        ]
    },
    {
        interval: "Segunda Maior",
        semitones: "1 tom",
        ascending: [
            { title: "Falling Slowly", artist: "Once" },
            { title: "Sleeping Sun", artist: "Nightwish" },
            { title: "Grace", artist: "Gordian Knot" },
            { title: "Happy Birthday", artist: "Traditional" }
        ],
        descending: [
            { title: "Yesterday", artist: "The Beatles" },
            { title: "Mamma Mia!", artist: "ABBA" },
            { title: "Enter Sandman", artist: "Metallica" },
            { title: "Eight Days a Week", artist: "The Beatles" },
            { title: "Crossroads riff", artist: "Eric Clapton" }
        ]
    },
    {
        interval: "Terça Menor",
        semitones: "1 tom e meio",
        ascending: [
            { title: "Seven Nation Army", artist: "The White Stripes" },
            { title: "Bad", artist: "Michael Jackson" },
            { title: "Smoke on the Water", artist: "Deep Purple" },
            { title: "Iron Man", artist: "Black Sabbath" },
            { title: "Whole Lotta Love", artist: "Led Zeppelin" },
            { title: "Happiness Is a Warm Gun", artist: "The Beatles" },
            { title: "Lingus", artist: "Snarky Puppy" }
        ],
        descending: [
            { title: "Hey Jude", artist: "The Beatles" },
            { title: "They Don't Care About Us", artist: "Michael Jackson" }
        ]
    },
    {
        interval: "Terça Maior",
        semitones: "2 tons",
        ascending: [
            { title: "Ob-la-di Ob-la-da", artist: "The Beatles" },
            { title: "Sweet Child O' Mine (Bass Intro)", artist: "Guns N' Roses" },
            { title: "Blister in the Sun", artist: "Violent Femmes" },
            { title: "When the Saints Go Marching In", artist: "Traditional" }
        ],
        descending: [
            { title: "Man in the Mirror (Verse)", artist: "Michael Jackson" },
            { title: "Summer Nights", artist: "Grease" }
        ]
    },
    {
        interval: "Quarta Justa",
        semitones: "2 tons e meio",
        ascending: [
            { title: "Love Me Tender", artist: "Elvis Presley" },
            { title: "Black or White", artist: "Michael Jackson" },
            { title: "Amazing Grace", artist: "Traditional" }
        ],
        descending: [
            { title: "Under Pressure", artist: "Queen" },
            { title: "Today", artist: "The Smashing Pumpkins" },
            { title: "Your Woman", artist: "White Town" }
        ]
    },
    {
        interval: "Trítono",
        semitones: "3 tons",
        ascending: [
            { title: "Juicebox", artist: "The Strokes" },
            { title: "Don't Drive Drunk", artist: "Stevie Wonder" },
            { title: "The Simpsons Theme", artist: "Danny Elfman" }
        ],
        descending: [
            { title: "Even Flow", artist: "Pearl Jam" },
            { title: "Black Sabbath", artist: "Black Sabbath" },
            { title: "YYZ", artist: "Rush" }
        ]
    },
    {
        interval: "Quinta Justa",
        semitones: "3 tons e meio",
        ascending: [
            { title: "Can't Help Falling in Love", artist: "Elvis Presley" },
            { title: "Blackbird", artist: "The Beatles" },
            { title: "Yeah!", artist: "Usher" },
            { title: "One", artist: "Metallica" },
            { title: "Star Wars Theme", artist: "John Williams" }
        ],
        descending: [
            { title: "Feelings", artist: "Richard Clayderman" },
            { title: "Donna, Donna", artist: "Shalom Secunda" }
        ]
    },
    {
        interval: "Sexta Menor",
        semitones: "4 tons",
        ascending: [
            { title: "We Are Young", artist: "Fun" },
            { title: "In My Life", artist: "The Beatles" },
            { title: "Slow Dancing in a Burning Room", artist: "John Mayer" },
            { title: "Nothing Compares 2 U", artist: "Sinéad O'Connor" },
            { title: "She's a Woman", artist: "The Beatles" }
        ],
        descending: [
            { title: "Call Me Maybe", artist: "Carly Rae Jepsen" },
            { title: "100 Years", artist: "Five for Fighting" }
        ]
    },
    {
        interval: "Sexta Maior",
        semitones: "4 tons e meio",
        ascending: [
            { title: "My Way", artist: "Frank Sinatra" },
            { title: "You Make Me Feel Brand New", artist: "The Stylistics" }
        ],
        descending: [
            { title: "Man In the Mirror (Chorus)", artist: "Michael Jackson" }
        ]
    },
    {
        interval: "Sétima Menor",
        semitones: "5 tons",
        ascending: [
            { title: "The Winner Takes It All", artist: "ABBA" },
            { title: "Chameleon", artist: "Herbie Hancock" },
            { title: "Josie", artist: "Steely Dan" },
            { title: "No sé tú", artist: "Luis Miguel" }
        ],
        descending: [
            { title: "Lady Jane", artist: "The Rolling Stones" }
        ]
    },
    {
        interval: "Sétima Maior",
        semitones: "5 tons e meio",
        ascending: [
            { title: "Take on Me", artist: "A-Ha" },
            { title: "Don't Know Why", artist: "Norah Jones" },
            { title: "Popular", artist: "Nada Surf" }
        ],
        descending: [
            { title: "Von", artist: "Zankyou No Terror" }
        ]
    },
    {
        interval: "Oitava Justa",
        semitones: "6 tons",
        ascending: [
            { title: "Sweet Child O' Mine", artist: "Guns N' Roses" },
            { title: "A Forest", artist: "The Cure" },
            { title: "Somewhere Over the Rainbow", artist: "Judy Garland" }
        ],
        descending: []
    }
];

// Função para renderizar a tabela
function renderSongsTable() {
    const tableBody = document.getElementById('songs-list');
    
    intervalSongsData.forEach(data => {
        const row = document.createElement('tr');
        
        // Coluna do Intervalo
        const intervalCell = document.createElement('td');
        intervalCell.innerHTML = `
            <span class="interval-name">${data.interval}</span>
            <span class="interval-semitones">${data.semitones}</span>
        `;
        row.appendChild(intervalCell);

        // Coluna Ascendente
        const ascendingCell = document.createElement('td');
        ascendingCell.innerHTML = generateSongListHTML(data.ascending);
        row.appendChild(ascendingCell);

        // Coluna Descendente
        const descendingCell = document.createElement('td');
        descendingCell.innerHTML = generateSongListHTML(data.descending);
        row.appendChild(descendingCell);

        tableBody.appendChild(row);
    });
}

// Função auxiliar para gerar o HTML da lista de músicas com link do YouTube
function generateSongListHTML(songsArray) {
    if (!songsArray || songsArray.length === 0) return '<span style="color:#ccc;">-</span>';

    return songsArray.map(song => {
        // Cria um link de busca no YouTube para garantir que sempre funcione
        const searchQuery = encodeURIComponent(`${song.title} ${song.artist} audio`);
        const youtubeUrl = `https://www.youtube.com/results?search_query=${searchQuery}`;

        return `
            <div class="song-item">
                <strong>${song.title}</strong> <span class="artist">(${song.artist})</span>
                <a href="${youtubeUrl}" target="_blank" class="yt-link" title="Ouvir no YouTube">
                    <i class="fab fa-youtube"></i>
                </a>
            </div>
        `;
    }).join('');
}

// Inicializa a tabela quando a página carrega
document.addEventListener('DOMContentLoaded', renderSongsTable);