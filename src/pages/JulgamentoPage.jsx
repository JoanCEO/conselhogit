import { useEffect, useState } from 'react'
import styles from './JulgamentoPage.module.css'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

export default function JulgamentoPage() {
  const { user } = useAuth()

  const [julgamentos, setJulgamentos] = useState([])
  const [julgamentoAtivo, setJulgamentoAtivo] = useState(null)

  const [mensagens, setMensagens] = useState([])
  const [mensagem, setMensagem] = useState('')
  const [loadingMensagens, setLoadingMensagens] = useState(false)
  const [enviandoMensagem, setEnviandoMensagem] = useState(false)

  const [votos, setVotos] = useState([])
  const [loadingVotos, setLoadingVotos] = useState(false)
  const [votando, setVotando] = useState(false)

  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [alterandoStatus, setAlterandoStatus] = useState(false)

  const [titulo, setTitulo] = useState('')
  const [assunto, setAssunto] = useState('')

  useEffect(() => {
    fetchJulgamentos()
  }, [])

  /*
    =========================
    CHAT + VOTOS + STATUS REALTIME
    =========================
  */

  useEffect(() => {
    if (!julgamentoAtivo) {
      setMensagens([])
      setVotos([])
      return
    }

    const julgamentoId = julgamentoAtivo.id

    fetchMensagens(julgamentoId)
    fetchVotos(julgamentoId)

    const channel = supabase
      .channel(`julgamento-${julgamentoId}`)

      // NOVAS MENSAGENS
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'julgamento_mensagens',
          filter: `julgamento_id=eq.${julgamentoId}`
        },
        async (payload) => {
          const novaMensagem = payload.new

          const { data, error } = await supabase
            .from('julgamento_mensagens')
            .select(`
              id,
              julgamento_id,
              user_id,
              mensagem,
              created_at,
              profiles:user_id (
                id,
                username,
                full_name,
                avatar_url
              )
            `)
            .eq('id', novaMensagem.id)
            .single()

          if (error) {
            console.error(
              'Erro ao buscar nova mensagem:',
              error
            )
            return
          }

          setMensagens((current) => {
            const jaExiste = current.some(
              (item) => item.id === data.id
            )

            if (jaExiste) {
              return current
            }

            return [
              ...current,
              data
            ]
          })
        }
      )

      // NOVOS VOTOS
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'julgamento_votos',
          filter: `julgamento_id=eq.${julgamentoId}`
        },
        async (payload) => {
          const novoVoto = payload.new

          const { data, error } = await supabase
            .from('julgamento_votos')
            .select(`
              id,
              julgamento_id,
              user_id,
              voto,
              created_at,
              profiles:user_id (
                id,
                username,
                full_name,
                avatar_url
              )
            `)
            .eq('id', novoVoto.id)
            .single()

          if (error) {
            console.error(
              'Erro ao buscar novo voto:',
              error
            )
            return
          }

          setVotos((current) => {
            const jaExiste = current.some(
              (item) => item.id === data.id
            )

            if (jaExiste) {
              return current
            }

            return [
              ...current,
              data
            ]
          })
        }
      )

      // ALTERAÇÃO DE VOTO
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'julgamento_votos',
          filter: `julgamento_id=eq.${julgamentoId}`
        },
        async (payload) => {
          const votoAtualizado = payload.new

          const { data, error } = await supabase
            .from('julgamento_votos')
            .select(`
              id,
              julgamento_id,
              user_id,
              voto,
              created_at,
              profiles:user_id (
                id,
                username,
                full_name,
                avatar_url
              )
            `)
            .eq('id', votoAtualizado.id)
            .single()

          if (error) {
            console.error(
              'Erro ao buscar voto atualizado:',
              error
            )
            return
          }

          setVotos((current) =>
            current.map((item) =>
              item.id === data.id
                ? data
                : item
            )
          )
        }
      )

      // ALTERAÇÃO DO STATUS DO JULGAMENTO
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'julgamentos',
          filter: `id=eq.${julgamentoId}`
        },
        (payload) => {
          setJulgamentoAtivo((current) => {
            if (!current) {
              return current
            }

            return {
              ...current,
              status: payload.new.status
            }
          })

          setJulgamentos((current) =>
            current.map((item) =>
              item.id === julgamentoId
                ? {
                    ...item,
                    status: payload.new.status
                  }
                : item
            )
          )
        }
      )

      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(
            'Realtime conectado ao julgamento:',
            julgamentoId
          )
        }

        if (status === 'CHANNEL_ERROR') {
          console.error(
            'Erro no canal Realtime do julgamento.'
          )
        }

        if (status === 'TIMED_OUT') {
          console.error(
            'Tempo esgotado ao conectar ao Realtime.'
          )
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [julgamentoAtivo])

  /*
    =========================
    JULGAMENTOS
    =========================
  */

  const fetchJulgamentos = async () => {
    setLoading(true)

    const { data, error } = await supabase
      .from('julgamentos')
      .select(`
        id,
        titulo,
        assunto,
        status,
        criado_por,
        created_at,
        profiles:criado_por (
          id,
          username,
          full_name,
          avatar_url
        )
      `)
      .order('created_at', {
        ascending: false
      })

    if (error) {
      console.error(
        'Erro ao buscar julgamentos:',
        error
      )

      setJulgamentos([])
    } else {
      setJulgamentos(data || [])

      const ativo = (data || []).find(
        (item) =>
          item.status === 'aguardando' ||
          item.status === 'aberto'
      )

      if (ativo) {
        setJulgamentoAtivo(ativo)
      }
    }

    setLoading(false)
  }

  /*
    =========================
    ALTERAR STATUS
    =========================
  */

  const alterarStatus = async (novoStatus) => {
    if (
      !user ||
      !julgamentoAtivo ||
      julgamentoAtivo.criado_por !== user.id ||
      alterandoStatus
    ) {
      return
    }

    setAlterandoStatus(true)

    const { error } = await supabase
      .from('julgamentos')
      .update({
        status: novoStatus
      })
      .eq('id', julgamentoAtivo.id)
      .eq('criado_por', user.id)

    if (error) {
      console.error(
        'Erro ao alterar status:',
        error
      )
    }

    setAlterandoStatus(false)
  }

  /*
    =========================
    MENSAGENS
    =========================
  */

  const fetchMensagens = async (julgamentoId) => {
    setLoadingMensagens(true)

    const { data, error } = await supabase
      .from('julgamento_mensagens')
      .select(`
        id,
        julgamento_id,
        user_id,
        mensagem,
        created_at,
        profiles:user_id (
          id,
          username,
          full_name,
          avatar_url
        )
      `)
      .eq('julgamento_id', julgamentoId)
      .order('created_at', {
        ascending: true
      })

    if (error) {
      console.error(
        'Erro ao buscar mensagens:',
        error
      )

      setMensagens([])
    } else {
      setMensagens(data || [])
    }

    setLoadingMensagens(false)
  }

  const enviarMensagem = async (e) => {
    e.preventDefault()

    if (
      !user ||
      !julgamentoAtivo ||
      julgamentoAtivo.status !== 'aberto'
    ) {
      return
    }

    const texto = mensagem.trim()

    if (!texto) {
      return
    }

    setEnviandoMensagem(true)

    const { error } = await supabase
      .from('julgamento_mensagens')
      .insert({
        julgamento_id: julgamentoAtivo.id,
        user_id: user.id,
        mensagem: texto
      })

    if (error) {
      console.error(
        'Erro ao enviar mensagem:',
        error
      )

      setEnviandoMensagem(false)
      return
    }

    setMensagem('')
    setEnviandoMensagem(false)
  }

  /*
    =========================
    VOTOS
    =========================
  */

  const fetchVotos = async (julgamentoId) => {
    setLoadingVotos(true)

    const { data, error } = await supabase
      .from('julgamento_votos')
      .select(`
        id,
        julgamento_id,
        user_id,
        voto,
        created_at,
        profiles:user_id (
          id,
          username,
          full_name,
          avatar_url
        )
      `)
      .eq('julgamento_id', julgamentoId)
      .order('created_at', {
        ascending: true
      })

    if (error) {
      console.error(
        'Erro ao buscar votos:',
        error
      )

      setVotos([])
    } else {
      setVotos(data || [])
    }

    setLoadingVotos(false)
  }

  const votar = async (tipoVoto) => {
    if (
      !user ||
      !julgamentoAtivo ||
      julgamentoAtivo.status !== 'aberto' ||
      votando
    ) {
      return
    }

    setVotando(true)

    const votoExistente = votos.find(
      (item) =>
        item.user_id === user.id
    )

    let error = null

    if (votoExistente) {
      const response = await supabase
        .from('julgamento_votos')
        .update({
          voto: tipoVoto
        })
        .eq('id', votoExistente.id)

      error = response.error
    } else {
      const response = await supabase
        .from('julgamento_votos')
        .insert({
          julgamento_id: julgamentoAtivo.id,
          user_id: user.id,
          voto: tipoVoto
        })

      error = response.error
    }

    if (error) {
      console.error(
        'Erro ao registrar voto:',
        error
      )

      setVotando(false)
      return
    }

    setVotando(false)
  }

  /*
    =========================
    CRIAR JULGAMENTO
    =========================
  */

  const criarJulgamento = async (e) => {
    e.preventDefault()

    if (!user) {
      return
    }

    if (
      !titulo.trim() ||
      !assunto.trim()
    ) {
      return
    }

    setCreating(true)

    const { data, error } = await supabase
      .from('julgamentos')
      .insert({
        titulo: titulo.trim(),
        assunto: assunto.trim(),
        criado_por: user.id,
        status: 'aguardando'
      })
      .select(`
        id,
        titulo,
        assunto,
        status,
        criado_por,
        created_at,
        profiles:criado_por (
          id,
          username,
          full_name,
          avatar_url
        )
      `)
      .single()

    if (error) {
      console.error(
        'Erro ao criar julgamento:',
        error
      )

      setCreating(false)
      return
    }

    setJulgamentos((current) => [
      data,
      ...current
    ])

    setJulgamentoAtivo(data)

    setTitulo('')
    setAssunto('')
    setShowCreate(false)
    setCreating(false)
  }

  /*
    =========================
    AUXILIARES
    =========================
  */

  const selecionarJulgamento = (
    julgamento
  ) => {
    setJulgamentoAtivo(julgamento)
  }

  const formatarHorario = (data) => {
    return new Date(data).toLocaleTimeString(
      'pt-BR',
      {
        hour: '2-digit',
        minute: '2-digit'
      }
    )
  }

  const obterNome = (profile) => {
    return (
      profile?.username ||
      profile?.full_name ||
      'Conselheiro'
    )
  }

  const obterInicial = (profile) => {
    return obterNome(profile)
      .charAt(0)
      .toUpperCase()
  }

  const votosSim = votos.filter(
    (item) => item.voto === 'sim'
  ).length

  const votosNao = votos.filter(
    (item) => item.voto === 'nao'
  ).length

  const totalVotos =
    votosSim + votosNao

  const porcentagemSim =
    totalVotos > 0
      ? Math.round(
          (votosSim / totalVotos) * 100
        )
      : 0

  const porcentagemNao =
    totalVotos > 0
      ? Math.round(
          (votosNao / totalVotos) * 100
        )
      : 0

  const meuVoto = votos.find(
    (item) =>
      item.user_id === user?.id
  )

  const existeJulgamentoAtivo =
    julgamentos.some(
      (item) =>
        item.status === 'aguardando' ||
        item.status === 'aberto'
    )

  const ehCriador =
    julgamentoAtivo?.criado_por === user?.id

  const estaAguardando =
    julgamentoAtivo?.status === 'aguardando'

  const estaAberto =
    julgamentoAtivo?.status === 'aberto'

  const estaEncerrado =
    julgamentoAtivo?.status === 'encerrado'

  return (
    <div className={styles.page}>

      {/* CABEÇALHO */}

      <div className={styles.header}>

        <div>

          <span
            className={styles.eyebrow}
          >
            CONSELHO BLAZE
          </span>

          <h1>
            Sala de Julgamento
          </h1>

          <p>
            Debate e votação dos membros
            do Conselho.
          </p>

        </div>

        <div
          className={styles.headerActions}
        >

          <div className={styles.status}>

            <span
              className={styles.statusDot}
            />

            {loading
              ? 'Carregando'
              : julgamentoAtivo
                ? estaAguardando
                  ? 'Aguardando'
                  : estaAberto
                    ? 'Em andamento'
                    : 'Encerrado'
                : `${julgamentos.length} julgamento${
                    julgamentos.length === 1
                      ? ''
                      : 's'
                  }`
            }

          </div>

          {!existeJulgamentoAtivo && (
            <button
              className={
                styles.createButton
              }
              onClick={() =>
                setShowCreate(
                  (current) => !current
                )
              }
            >
              {showCreate
                ? 'Cancelar'
                : 'Novo julgamento'
              }
            </button>
          )}

        </div>

      </div>

      {/* FORMULÁRIO */}

      {showCreate &&
        !existeJulgamentoAtivo && (
          <section
            className={
              styles.createCard
            }
          >

            <div
              className={
                styles.createHeader
              }
            >

              <span
                className={
                  styles.sectionLabel
                }
              >
                NOVO JULGAMENTO
              </span>

              <h2>
                Criar uma nova sala
              </h2>

              <p>
                Defina o assunto que será
                debatido pelos membros
                do Conselho.
              </p>

            </div>

            <form
              className={
                styles.createForm
              }
              onSubmit={
                criarJulgamento
              }
            >

              <div
                className={
                  styles.field
                }
              >

                <label htmlFor="titulo">
                  Título
                </label>

                <input
                  id="titulo"
                  type="text"
                  value={titulo}
                  onChange={(e) =>
                    setTitulo(
                      e.target.value
                    )
                  }
                  placeholder="Título do julgamento"
                  maxLength={100}
                  required
                />

              </div>

              <div
                className={
                  styles.field
                }
              >

                <label htmlFor="assunto">
                  Assunto em debate
                </label>

                <textarea
                  id="assunto"
                  value={assunto}
                  onChange={(e) =>
                    setAssunto(
                      e.target.value
                    )
                  }
                  placeholder="Descreva o assunto que será julgado..."
                  maxLength={500}
                  rows={4}
                  required
                />

              </div>

              <button
                type="submit"
                className={
                  styles.submitButton
                }
                disabled={creating}
              >
                {creating
                  ? 'Criando...'
                  : 'Criar julgamento'
                }
              </button>

            </form>

          </section>
        )}

      {/* LISTA */}

      {!julgamentoAtivo && (
        <section
          className={styles.subject}
        >

          <span
            className={
              styles.sectionLabel
            }
          >
            JULGAMENTOS
          </span>

          {loading ? (

            <h2>
              Carregando...
            </h2>

          ) : julgamentos.length === 0 ? (

            <>
              <h2>
                Nenhum julgamento criado
              </h2>

              <p>
                Crie uma nova sala para
                iniciar um debate e uma
                votação.
              </p>
            </>

          ) : (

            <div
              className={
                styles.julgamentoList
              }
            >

              {julgamentos.map(
                (julgamento) => (

                  <button
                    key={julgamento.id}
                    className={
                      styles.julgamentoItem
                    }
                    onClick={() =>
                      selecionarJulgamento(
                        julgamento
                      )
                    }
                  >

                    <div>

                      <h2>
                        {julgamento.titulo}
                      </h2>

                      <p>
                        {julgamento.assunto}
                      </p>

                    </div>

                    <span
                      className={
                        styles.julgamentoStatus
                      }
                    >
                      {julgamento.status}
                    </span>

                  </button>

                )
              )}

            </div>

          )}

        </section>
      )}

      {/* JULGAMENTO */}

      {julgamentoAtivo && (
        <>

          <section
            className={styles.subject}
          >

            <span
              className={
                styles.sectionLabel
              }
            >
              ASSUNTO EM DEBATE
            </span>

            <h2>
              {julgamentoAtivo.titulo}
            </h2>

            <p>
              {julgamentoAtivo.assunto}
            </p>

          </section>

          <button
            className={
              styles.backButton
            }
            onClick={() =>
              setJulgamentoAtivo(null)
            }
          >
            Voltar para os julgamentos
          </button>

          {/* CONTROLE DO CRIADOR */}

          {ehCriador &&
            estaAguardando && (
              <button
                className={
                  styles.createButton
                }
                onClick={() =>
                  alterarStatus('aberto')
                }
                disabled={alterandoStatus}
              >
                {alterandoStatus
                  ? 'Abrindo...'
                  : 'Abrir julgamento'
                }
              </button>
            )}

          {ehCriador &&
            estaAberto && (
              <button
                className={
                  styles.createButton
                }
                onClick={() =>
                  alterarStatus('encerrado')
                }
                disabled={alterandoStatus}
              >
                {alterandoStatus
                  ? 'Encerrando...'
                  : 'Encerrar julgamento'
                }
              </button>
            )}

          {/* CRIADOR */}

          <div
            className={styles.memberBar}
          >

            <div
              className={
                styles.memberAvatar
              }
            >

              {julgamentoAtivo
                .profiles?.avatar_url ? (

                <img
                  src={
                    julgamentoAtivo
                      .profiles
                      .avatar_url
                  }
                  alt=""
                />

              ) : (

                obterInicial(
                  julgamentoAtivo.profiles
                )

              )}

            </div>

            <div
              className={
                styles.memberInfo
              }
            >

              <strong>
                {obterNome(
                  julgamentoAtivo.profiles
                )}
              </strong>

              <span>
                Criador do julgamento
              </span>

            </div>

          </div>

          {/* AGUARDANDO */}

          {estaAguardando && (
            <section
              className={styles.subject}
            >

              <span
                className={
                  styles.sectionLabel
                }
              >
                AGUARDANDO INÍCIO
              </span>

              <h2>
                O julgamento ainda não começou.
              </h2>

              <p>
                O chat e a votação serão
                liberados quando o criador
                abrir a sessão.
              </p>

            </section>
          )}

          {/* JULGAMENTO ABERTO */}

          {estaAberto && (
            <div
              className={styles.content}
            >

              {/* VOTAÇÃO */}

              <section
                className={
                  styles.voteCard
                }
              >

                <div
                  className={
                    styles.cardHeader
                  }
                >

                  <div>

                    <span
                      className={
                        styles.sectionLabel
                      }
                    >
                      VOTAÇÃO
                    </span>

                    <h3>
                      {meuVoto
                        ? `Seu voto: ${
                            meuVoto.voto ===
                            'sim'
                              ? 'Sim'
                              : 'Não'
                          }`
                        : 'Registre seu voto'
                      }
                    </h3>

                  </div>

                </div>

                <div
                  className={
                    styles.voteButtons
                  }
                >

                  <button
                    className={`${styles.voteButton} ${
                      meuVoto?.voto === 'sim'
                        ? styles.voteSelected
                        : ''
                    }`}
                    onClick={() =>
                      votar('sim')
                    }
                    disabled={
                      votando ||
                      loadingVotos
                    }
                  >
                    {votando
                      ? '...'
                      : 'SIM'
                    }
                  </button>

                  <button
                    className={`${styles.voteButton} ${
                      meuVoto?.voto === 'nao'
                        ? styles.voteSelected
                        : ''
                    }`}
                    onClick={() =>
                      votar('nao')
                    }
                    disabled={
                      votando ||
                      loadingVotos
                    }
                  >
                    {votando
                      ? '...'
                      : 'NÃO'
                    }
                  </button>

                </div>

                <div
                  className={styles.results}
                >

                  <div
                    className={
                      styles.result
                    }
                  >

                    <div
                      className={
                        styles.resultTop
                      }
                    >

                      <span>
                        Sim
                      </span>

                      <strong>
                        {votosSim}{' '}
                        {votosSim === 1
                          ? 'voto'
                          : 'votos'
                        }
                      </strong>

                    </div>

                    <div
                      className={
                        styles.progress
                      }
                    >

                      <div
                        className={
                          styles.progressFill
                        }
                        style={{
                          width: `${porcentagemSim}%`
                        }}
                      />

                    </div>

                  </div>

                  <div
                    className={
                      styles.result
                    }
                  >

                    <div
                      className={
                        styles.resultTop
                      }
                    >

                      <span>
                        Não
                      </span>

                      <strong>
                        {votosNao}{' '}
                        {votosNao === 1
                          ? 'voto'
                          : 'votos'
                        }
                      </strong>

                    </div>

                    <div
                      className={
                        styles.progress
                      }
                    >

                      <div
                        className={
                          styles.progressFill
                        }
                        style={{
                          width: `${porcentagemNao}%`
                        }}
                      />

                    </div>

                  </div>

                </div>

                <div
                  className={
                    styles.voteLog
                  }
                >

                  <div
                    className={
                      styles.voteLogTitle
                    }
                  >
                    REGISTRO DA VOTAÇÃO
                  </div>

                  {loadingVotos ? (

                    <div
                      className={
                        styles.emptyState
                      }
                    >
                      Carregando votos...
                    </div>

                  ) : votos.length === 0 ? (

                    <div
                      className={
                        styles.emptyState
                      }
                    >
                      Nenhum voto registrado.
                    </div>

                  ) : (

                    votos.map((item) => (

                      <div
                        key={item.id}
                        className={
                          styles.voteItem
                        }
                      >

                        <strong>
                          {obterNome(
                            item.profiles
                          )}
                        </strong>

                        <span>
                          votou
                        </span>

                        <strong>
                          {item.voto ===
                          'sim'
                            ? 'Sim'
                            : 'Não'
                          }
                        </strong>

                        <span>
                          às{' '}
                          {formatarHorario(
                            item.created_at
                          )}
                        </span>

                      </div>

                    ))

                  )}

                </div>

              </section>

              {/* CHAT */}

              <section
                className={
                  styles.chatCard
                }
              >

                <div
                  className={
                    styles.chatHeader
                  }
                >

                  <div>

                    <span
                      className={
                        styles.sectionLabel
                      }
                    >
                      DISCUSSÃO
                    </span>

                    <h3>
                      Chat do Conselho
                    </h3>

                  </div>

                  <span
                    className={
                      styles.online
                    }
                  >
                    {mensagens.length}{' '}
                    {mensagens.length === 1
                      ? 'mensagem'
                      : 'mensagens'
                    }
                  </span>

                </div>

                <div
                  className={
                    styles.messages
                  }
                >

                  {loadingMensagens ? (

                    <div
                      className={
                        styles.emptyState
                      }
                    >
                      Carregando mensagens...
                    </div>

                  ) : mensagens.length === 0 ? (

                    <div
                      className={
                        styles.emptyState
                      }
                    >
                      Nenhuma mensagem ainda.
                    </div>

                  ) : (

                    mensagens.map(
                      (item) => (

                        <div
                          key={item.id}
                          className={
                            styles.message
                          }
                        >

                          <div
                            className={
                              styles.messageAvatar
                            }
                          >

                            {item.profiles
                              ?.avatar_url ? (

                              <img
                                src={
                                  item
                                    .profiles
                                    .avatar_url
                                }
                                alt=""
                              />

                            ) : (

                              obterInicial(
                                item.profiles
                              )

                            )}

                          </div>

                          <div>

                            <div
                              className={
                                styles.messageMeta
                              }
                            >

                              <strong>
                                {obterNome(
                                  item.profiles
                                )}
                              </strong>

                              <span>
                                {formatarHorario(
                                  item.created_at
                                )}
                              </span>

                            </div>

                            <p>
                              {item.mensagem}
                            </p>

                          </div>

                        </div>

                      )
                    )

                  )}

                </div>

                <form
                  className={
                    styles.chatInput
                  }
                  onSubmit={
                    enviarMensagem
                  }
                >

                  <input
                    type="text"
                    value={mensagem}
                    onChange={(e) =>
                      setMensagem(
                        e.target.value
                      )
                    }
                    placeholder="Escreva sua mensagem..."
                    maxLength={1000}
                    disabled={
                      enviandoMensagem
                    }
                  />

                  <button
                    type="submit"
                    disabled={
                      enviandoMensagem ||
                      !mensagem.trim()
                    }
                  >
                    {enviandoMensagem
                      ? '...'
                      : 'Enviar'
                    }
                  </button>

                </form>

              </section>

            </div>
          )}

          {/* ENCERRADO */}

          {estaEncerrado && (
            <section
              className={styles.subject}
            >

              <span
                className={
                  styles.sectionLabel
                }
              >
                JULGAMENTO ENCERRADO
              </span>

              <h2>
                Sessão encerrada.
              </h2>

              <p>
                A votação e o chat foram
                encerrados. O resultado
                permanece disponível para
                consulta.
              </p>

              <div
                className={styles.results}
              >

                <div
                  className={
                    styles.result
                  }
                >

                  <div
                    className={
                      styles.resultTop
                    }
                  >

                    <span>
                      Sim
                    </span>

                    <strong>
                      {votosSim}{' '}
                      {votosSim === 1
                        ? 'voto'
                        : 'votos'
                      }{' '}
                      ({porcentagemSim}%)
                    </strong>

                  </div>

                  <div
                    className={
                      styles.progress
                    }
                  >

                    <div
                      className={
                        styles.progressFill
                      }
                      style={{
                        width: `${porcentagemSim}%`
                      }}
                    />

                  </div>

                </div>

                <div
                  className={
                    styles.result
                  }
                >

                  <div
                    className={
                      styles.resultTop
                    }
                  >

                    <span>
                      Não
                    </span>

                    <strong>
                      {votosNao}{' '}
                      {votosNao === 1
                        ? 'voto'
                        : 'votos'
                      }{' '}
                      ({porcentagemNao}%)
                    </strong>

                  </div>

                  <div
                    className={
                      styles.progress
                    }
                  >

                    <div
                      className={
                        styles.progressFill
                      }
                      style={{
                        width: `${porcentagemNao}%`
                      }}
                    />

                  </div>

                </div>

              </div>

              <div
                className={styles.voteLog}
              >

                <div
                  className={
                    styles.voteLogTitle
                  }
                >
                  REGISTRO FINAL
                </div>

                {votos.length === 0 ? (

                  <div
                    className={
                      styles.emptyState
                    }
                  >
                    Nenhum voto foi registrado.
                  </div>

                ) : (

                  votos.map((item) => (

                    <div
                      key={item.id}
                      className={
                        styles.voteItem
                      }
                    >

                      <strong>
                        {obterNome(
                          item.profiles
                        )}
                      </strong>

                      <span>
                        votou
                      </span>

                      <strong>
                        {item.voto === 'sim'
                          ? 'Sim'
                          : 'Não'
                        }
                      </strong>

                      <span>
                        às{' '}
                        {formatarHorario(
                          item.created_at
                        )}
                      </span>

                    </div>

                  ))

                )}

              </div>

            </section>
          )}

        </>

      )}

    </div>
  )
}