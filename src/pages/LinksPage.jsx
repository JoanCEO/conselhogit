import { useState } from 'react'
import styles from './LinksPage.module.css'

const LINKS = [
  {
    category: 'Counter-Strike 2',
    items: [
      { name: 'CS.MONEY', desc: 'Marketplace de skins confiável, compra e venda com segurança.', url: 'https://cs.money', tag: 'Skins' },
      { name: 'CS:GO Skins', desc: 'Marketplace e plataforma para compra e venda de skins de CS.', url: 'https://csgo-skins.com', tag: 'Skins' },
      { name: 'SkinsMonkeys', desc: 'Plataforma para negociação e troca de skins de CS.', url: 'https://skinsmonkey.com', tag: 'Skins' },
      { name: 'BRSkins', desc: 'Marketplace brasileiro para compra, venda e troca de skins de CS2, com variedade de itens e preços competitivos.', url: 'https://brskins.gg', tag: 'Skins' },
      { name: 'NeshaStore', desc: 'Loja e marketplace de skins para jogadores de Counter-Strike.', url: 'https://neshastore.com', tag: 'Skins' },
      { name: 'SkinPlace', desc: 'Marketplace de skins de CS2 para compra, venda e troca de itens..', url: 'https://skin.place', tag: 'Skins' },
      { name: 'Upgrader', desc: 'Plataforma de upgrade e troca de skins de Counter-Strike.', url: 'https://upgrader.pro', tag: 'Upgrade' },
    ]
  },
  {
    category: 'Links & Ferramentas',
    items: [
      { name: 'Hydra', desc: 'Launcher gratuito e open source para gerenciar sua biblioteca de jogos.', url: 'https://hydralauncher.gg', tag: 'Launcher' },
      { name: 'HydraLinks', desc: 'Links de fontes para todo tipo de jogo.', url: 'https://library.hydra.wiki/sources', tag: 'Launcher' },
      { name: 'HowLongToBeat', desc: 'Descubra quanto tempo leva para zerar qualquer jogo.', url: 'https://howlongtobeat.com', tag: 'Utilidade' },
      { name: 'PCGamingWiki', desc: 'Wiki com fixes, configurações e patches para jogos de PC.', url: 'https://www.pcgamingwiki.com', tag: 'Wiki' },
      { name: 'ProSettings', desc: 'Configurações e periféricos dos melhores jogadores profissionais.', url: 'https://prosettings.net', tag: 'Config' },
    ]
  },
  {
    category: 'Comunidade & Notícias',
    items: [
      { name: 'The Gamer', desc: 'Notícias, reviews e guias do universo gamer.', url: 'https://www.thegamer.com', tag: 'Notícias' },
      { name: 'r/GlobalOffensive', desc: 'Subreddit oficial da comunidade de CS2.', url: 'https://reddit.com/r/GlobalOffensive', tag: 'Comunidade' },
      { name: 'HLTV', desc: 'O maior portal de CS do mundo — rankings, resultados e estatísticas.', url: 'https://hltv.org', tag: 'eSports' },
      { name: 'Liquipedia', desc: 'Wiki de eSports com brackets, times e histórico de torneios.', url: 'https://liquipedia.net', tag: 'eSports' },
    ]
  },
  {
    category: 'Futebol Brasileiro e Mundial',
    items: [
      {
        name: 'Tabela Brasileirão Série A',
        desc: 'Tabela atualizada do Brasileirão Série A',
        url: 'https://www.cbf.com.br/futebol-brasileiro/tabelas/campeonato-brasileiro/serie-a/2026',
        tag: 'Brasil'
      },
      {
        name: 'Tabela Premier League',
        desc: 'Tabela atualizada do Campeonato Inglês',
        url: 'https://www.premierleague.com/en/tables',
        tag: 'Inglaterra'
      },
      {
        name: 'Tabela La Liga',
        desc: 'Tabela atualizada do Campeonato Espanhol',
        url: 'https://www.laliga.com/en-GB/laliga-easports/standing',
        tag: 'Espanha'
      },
      {
        name: 'Tabela Serie A',
        desc: 'Tabela atualizada do Campeonato Italiano',
        url: 'https://www.legaseriea.it/en/serie-a/classifica',
        tag: 'Itália'
      },
      {
        name: 'Tabela Bundesliga',
        desc: 'Tabela atualizada do Campeonato Alemão',
        url: 'https://www.bundesliga.com/en/bundesliga/table',
        tag: 'Alemanha'
      },
      {
        name: 'Tabela Ligue 1',
        desc: 'Tabela atualizada do Campeonato Francês',
        url: 'https://ligue1.com/en',
        tag: 'França'
      },
      {
        name: 'Tabela Primeira Liga',
        desc: 'Tabela atualizada do Campeonato Português',
        url: 'https://www.ligaportugal.pt/en/liga/ligameister/tabela',
        tag: 'Portugal'
      }
    ]
  }
]

const ExternalIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </svg>
)

const SearchIcon = () => (
  <svg
    width="17"
    height="17"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-4-4" />
  </svg>
)

export default function LinksPage() {
  const [search, setSearch] = useState('')

  const normalizedSearch = search
    .toLowerCase()
    .trim()

  const filteredSections = LINKS
    .map(section => {
      const filteredItems = section.items.filter(link => {
        if (!normalizedSearch) return true

        return (
          link.name.toLowerCase().includes(normalizedSearch) ||
          link.desc.toLowerCase().includes(normalizedSearch) ||
          link.tag.toLowerCase().includes(normalizedSearch) ||
          section.category.toLowerCase().includes(normalizedSearch)
        )
      })

      return {
        ...section,
        items: filteredItems
      }
    })
    .filter(section => section.items.length > 0)

  const hasResults = filteredSections.length > 0

  return (
    <div className={styles.page}>

      <div className={styles.pageHead}>
        <h1 className={styles.title}>
          Links da Comunidade
        </h1>

        <p className={styles.sub}>
          Sites verificados e usados pelo Conselho
        </p>
      </div>

      <div className={styles.searchBox}>
        <span className={styles.searchIcon}>
          <SearchIcon />
        </span>

        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar links, plataformas ou categorias..."
          className={styles.searchInput}
        />

        {search && (
          <button
            className={styles.clearSearch}
            onClick={() => setSearch('')}
            type="button"
            aria-label="Limpar busca"
          >
            ×
          </button>
        )}
      </div>

      {!hasResults ? (
        <div className={styles.emptySearch}>
          <h2>Nenhum link encontrado</h2>
          <p>
            Não encontramos nenhum link para "{search}".
          </p>
        </div>
      ) : (
        filteredSections.map(section => (
          <section
            key={section.category}
            className={styles.section}
          >
            <h2 className={styles.categoryTitle}>
              {section.category}
            </h2>

            <div className={styles.grid}>
              {section.items.map(link => (
                <a
                  key={link.name}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.card}
                >
                  <div className={styles.cardTop}>
                    <div>
                      <span className={styles.tag}>
                        {link.tag}
                      </span>

                      <h3 className={styles.linkName}>
                        {link.name}
                      </h3>
                    </div>

                    <span className={styles.externalIcon}>
                      <ExternalIcon />
                    </span>
                  </div>

                  <p className={styles.linkDesc}>
                    {link.desc}
                  </p>

                  <span className={styles.linkUrl}>
                    {link.url
                      .replace('https://', '')
                      .replace('http://', '')}
                  </span>
                </a>
              ))}
            </div>
          </section>
        ))
      )}

    </div>
  )
}