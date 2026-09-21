import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { SpinnerIcon, TrashIcon, EditIcon, XIcon } from '../components/Icons'
import styles from './ConvocacoesPage.module.css'

function ConvocacaoForm({ existing, onSave, onCancel }) {
  const { user } = useAuth()
  const [titulo, setTitulo] = useState(existing?.titulo || '')
  const [conteudo, setConteudo] = useState(existing?.conteudo || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!titulo.trim() || !conteudo.trim()) {
      setError('Preencha todos os campos.')
      return
    }

    setLoading(true)
    setError('')

    if (existing) {
      const { error } = await supabase
        .from('convocacoes')
        .update({
          titulo,
          conteudo
        })
        .eq('id', existing.id)

      if (error) {
        setError('Não foi possível salvar a convocação.')
        setLoading(false)
        return
      }
    } else {
      const { error } = await supabase
        .from('convocacoes')
        .insert({
          titulo,
          conteudo,
          autor_id: user.id
        })

      if (error) {
        setError(
          'Você não possui autorização para criar uma convocação no momento.'
        )
        setLoading(false)
        return
      }
    }

    setLoading(false)
    onSave()
  }

  return (
    <div className={styles.formCard}>
      <div className={styles.formHead}>
        <h3>
          {existing
            ? 'Editar convocação'
            : 'Nova convocação'}
        </h3>

        <button
          onClick={onCancel}
          className={styles.iconBtn}
        >
          <XIcon size={18} />
        </button>
      </div>

      <input
        className={styles.input}
        placeholder="Título da convocação"
        value={titulo}
        onChange={e => setTitulo(e.target.value)}
      />

      <textarea
        className={styles.textarea}
        placeholder="Descreva a convocação, pauta, local..."
        value={conteudo}
        onChange={e => setConteudo(e.target.value)}
        rows={5}
      />

      {error && (
        <p className={styles.error}>
          {error}
        </p>
      )}

      <div className={styles.formActions}>
        <button
          onClick={onCancel}
          className={styles.cancelBtn}
        >
          Cancelar
        </button>

        <button
          onClick={handleSubmit}
          disabled={loading}
          className={styles.submitBtn}
        >
          {loading ? (
            <SpinnerIcon size={16} />
          ) : existing ? (
            'Salvar'
          ) : (
            'Convocar'
          )}
        </button>
      </div>
    </div>
  )
}

export default function ConvocacoesPage() {
  const { user } = useAuth()

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)

  const [bloqueadoAte, setBloqueadoAte] = useState(null)
  const [loadingBloqueio, setLoadingBloqueio] = useState(true)

  const fetch = useCallback(async () => {
    const { data: convs } = await supabase
      .from('convocacoes')
      .select('*')
      .order('criado_em', { ascending: false })

    if (!convs || convs.length === 0) {
      setItems([])
      setLoading(false)
      return
    }

    const autorIds = [
      ...new Set(convs.map(c => c.autor_id))
    ]

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, avatar_url')
      .in('id', autorIds)

    const profileMap = Object.fromEntries(
      (profiles || []).map(p => [p.id, p])
    )

    setItems(
      convs.map(c => ({
        ...c,
        username:
          profileMap[c.autor_id]?.username ||
          'Membro',
        avatar_url:
          profileMap[c.autor_id]?.avatar_url ||
          null,
      }))
    )

    setLoading(false)
  }, [])

  const fetchBloqueio = useCallback(async () => {
    if (!user?.id) {
      setBloqueadoAte(null)
      setLoadingBloqueio(false)
      return
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('convocacoes_bloqueado_ate')
      .eq('id', user.id)
      .single()

    if (error) {
      console.error(
        'Erro ao verificar bloqueio:',
        error
      )

      setBloqueadoAte(null)
    } else {
      setBloqueadoAte(
        data?.convocacoes_bloqueado_ate || null
      )
    }

    setLoadingBloqueio(false)
  }, [user?.id])

  useEffect(() => {
    fetch()
    fetchBloqueio()
  }, [fetch, fetchBloqueio])

  useEffect(() => {
    const ch = supabase
      .channel('convocacoes-rt')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'convocacoes'
        },
        fetch
      )
      .subscribe()

    return () => {
      supabase.removeChannel(ch)
    }
  }, [fetch])

  const handleDelete = async id => {
    if (!confirm('Excluir convocação?')) return

    await supabase
      .from('convocacoes')
      .delete()
      .eq('id', id)

    fetch()
  }

  const dataBloqueio = bloqueadoAte
    ? new Date(bloqueadoAte)
    : null

  const estaBloqueado =
    dataBloqueio &&
    dataBloqueio.getTime() > Date.now()

  const bloqueioFormatado = dataBloqueio
    ? dataBloqueio.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      })
    : null

  const horarioBloqueio = dataBloqueio
    ? dataBloqueio.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit'
      })
    : null

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>
            Convocar o Conselho
          </h1>

          <p className={styles.sub}>
            Publique uma pauta para os membros
          </p>
        </div>

        {!showForm && !editItem && (
          <button
            className={styles.newBtn}
            onClick={() => setShowForm(true)}
            disabled={
              loadingBloqueio || estaBloqueado
            }
          >
            + Nova convocação
          </button>
        )}
      </div>

      {estaBloqueado && (
        <div className={styles.disciplinaryNotice}>
          <div className={styles.disciplinaryContent}>
            <strong>
              Convocações temporariamente bloqueadas
            </strong>

            <p>
              Você está impedido de criar novas
              convocações por medida disciplinar.
            </p>

            <span>
              Seu acesso será restaurado em{' '}
              <strong>
                {bloqueioFormatado}
              </strong>{' '}
              às{' '}
              <strong>
                {horarioBloqueio}
              </strong>.
            </span>
          </div>
        </div>
      )}

      {showForm && (
        <ConvocacaoForm
          onSave={() => {
            setShowForm(false)
            fetch()
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {editItem && (
        <ConvocacaoForm
          existing={editItem}
          onSave={() => {
            setEditItem(null)
            fetch()
          }}
          onCancel={() => setEditItem(null)}
        />
      )}

      {loading ? (
        <div className={styles.center}>
          <SpinnerIcon size={26} />
        </div>
      ) : items.length === 0 ? (
        <div className={styles.empty}>
          <p>Nenhuma convocação publicada.</p>

          <span>
            Seja o primeiro a convocar o Conselho.
          </span>
        </div>
      ) : (
        <div className={styles.list}>
          {items.map(item => (
            <div
              key={item.id}
              className={styles.card}
            >
              <div className={styles.cardTop}>
                <h2 className={styles.cardTitle}>
                  {item.titulo}
                </h2>

                {user?.id === item.autor_id && (
                  <div className={styles.cardActions}>
                    <button
                      className={styles.iconBtn}
                      onClick={() => {
                        setEditItem(item)
                        setShowForm(false)
                      }}
                    >
                      <EditIcon size={15} />
                    </button>

                    <button
                      className={`${styles.iconBtn} ${styles.danger}`}
                      onClick={() =>
                        handleDelete(item.id)
                      }
                    >
                      <TrashIcon size={15} />
                    </button>
                  </div>
                )}
              </div>

              <p className={styles.cardContent}>
                {item.conteudo}
              </p>

              <div className={styles.cardFooter}>
                <div className={styles.authorRow}>
                  <div className={styles.avatar}>
                    {item.avatar_url ? (
                      <img
                        src={item.avatar_url}
                        alt=""
                      />
                    ) : (
                      <span>
                        {(item.username || '?')[0].toUpperCase()}
                      </span>
                    )}
                  </div>

                  <span className={styles.authorName}>
                    Assinado por{' '}
                    <strong>
                      {item.username}
                    </strong>
                  </span>
                </div>

                <span className={styles.date}>
                  {new Date(
                    item.criado_em
                  ).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric'
                  })}
                  {' — '}
                  {new Date(
                    item.criado_em
                  ).toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}