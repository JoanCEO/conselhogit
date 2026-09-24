import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import styles from './NovidadesPage.module.css'

const OWNER_ID = 'b123d960-2423-4532-a8a7-c3504fc34502'

export default function NovidadesPage() {
  const { user } = useAuth()

  const [patchNotes, setPatchNotes] = useState([])
  const [loading, setLoading] = useState(true)

  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)

  const [editingId, setEditingId] = useState(null)

  const [version, setVersion] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')

  const [ownerProfile, setOwnerProfile] = useState(null)

  const isOwner = user?.id === OWNER_ID

  useEffect(() => {
    loadPatchNotes()
    loadOwnerProfile()

    /*
     * Realtime do Supabase.
     *
     * Qualquer INSERT, UPDATE ou DELETE
     * na tabela patch_notes será recebido
     * automaticamente por todos os usuários
     * que estiverem com esta página aberta.
     */
    const channel = supabase
      .channel('patch-notes-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'patch_notes'
        },
        payload => {
          console.log(
            'Atualização Realtime recebida:',
            payload
          )

          if (payload.eventType === 'INSERT') {
            setPatchNotes(current => {
              const exists = current.some(
                item => item.id === payload.new.id
              )

              if (exists) {
                return current
              }

              return [payload.new, ...current].sort(
                (a, b) =>
                  new Date(b.created_at) -
                  new Date(a.created_at)
              )
            })
          }

          if (payload.eventType === 'UPDATE') {
            setPatchNotes(current =>
              current
                .map(item =>
                  item.id === payload.new.id
                    ? payload.new
                    : item
                )
                .sort(
                  (a, b) =>
                    new Date(b.created_at) -
                    new Date(a.created_at)
                )
            )
          }

          if (payload.eventType === 'DELETE') {
            setPatchNotes(current =>
              current.filter(
                item => item.id !== payload.old.id
              )
            )
          }
        }
      )
      .subscribe(status => {
        console.log(
          'Status Realtime patch notes:',
          status
        )
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const loadPatchNotes = async () => {
    setLoading(true)

    try {
      const { data, error } = await supabase
        .from('patch_notes')
        .select('*')
        .order('created_at', {
          ascending: false
        })

      if (error) {
        console.error(
          'Erro ao carregar novidades:',
          error
        )

        return
      }

      setPatchNotes(data || [])
    } catch (error) {
      console.error(
        'Erro inesperado ao carregar novidades:',
        error
      )
    } finally {
      setLoading(false)
    }
  }

  const loadOwnerProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', OWNER_ID)
        .single()

      if (error) {
        console.error(
          'Erro ao carregar perfil do autor:',
          error
        )

        return
      }

      setOwnerProfile(data)
    } catch (error) {
      console.error(
        'Erro inesperado ao carregar perfil do autor:',
        error
      )
    }
  }

  const resetForm = () => {
    setVersion('')
    setTitle('')
    setDescription('')
    setEditingId(null)
    setShowForm(false)
  }

  const handleCreate = async event => {
    event.preventDefault()

    if (!isOwner || saving) {
      return
    }

    if (!version.trim() || !title.trim()) {
      return
    }

    setSaving(true)

    try {
      if (editingId) {
        const { error } = await supabase
          .from('patch_notes')
          .update({
            version: version.trim(),
            title: title.trim(),
            description: description.trim() || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingId)

        if (error) {
          console.error(
            'Erro ao editar atualização:',
            error
          )

          alert(
            `Não foi possível editar a atualização.\n\n${error.message}`
          )

          return
        }
      } else {
        const { error } = await supabase
          .from('patch_notes')
          .insert({
            version: version.trim(),
            title: title.trim(),
            description: description.trim() || null
          })

        if (error) {
          console.error(
            'Erro ao publicar atualização:',
            error
          )

          alert(
            `Não foi possível publicar a atualização.\n\n${error.message}`
          )

          return
        }
      }

      /*
       * Não precisamos adicionar manualmente
       * a publicação na tela.
       *
       * O Supabase Realtime vai enviar o INSERT/UPDATE
       * para esta página automaticamente.
       */
      resetForm()
    } catch (error) {
      console.error(
        'Erro inesperado ao salvar atualização:',
        error
      )

      alert(
        `Ocorreu um erro inesperado.\n\n${error.message || error}`
      )
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = patch => {
    if (!isOwner) {
      return
    }

    setEditingId(patch.id)
    setVersion(patch.version || '')
    setTitle(patch.title || '')
    setDescription(patch.description || '')
    setShowForm(true)

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }

  const handleDelete = async patch => {
    if (!isOwner) {
      return
    }

    const confirmed = window.confirm(
      `Tem certeza que deseja excluir a atualização "${patch.title}"?`
    )

    if (!confirmed) {
      return
    }

    try {
      const { error } = await supabase
        .from('patch_notes')
        .delete()
        .eq('id', patch.id)

      if (error) {
        console.error(
          'Erro ao excluir atualização:',
          error
        )

        alert(
          `Não foi possível excluir a atualização.\n\n${error.message}`
        )

        return
      }

      /*
       * O DELETE também será recebido pelo Realtime.
       * Não precisamos alterar patchNotes manualmente.
       */
    } catch (error) {
      console.error(
        'Erro inesperado ao excluir atualização:',
        error
      )

      alert(
        `Ocorreu um erro ao excluir.\n\n${error.message || error}`
      )
    }
  }

  const formatDate = date => {
    if (!date) return ''

    return new Date(date).toLocaleString(
      'pt-BR',
      {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }
    )
  }

  const authorUsername =
    ownerProfile?.username || 'conselhoblaze'

  const authorAvatar =
    ownerProfile?.avatar_url || '/default-avatar.png'

  const renderDescription = description => {
    if (!description) {
      return null
    }

    const lines = description
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)

    return (
      <div className={styles.description}>
        {lines.map((line, index) => (
          <div
            key={index}
            className={styles.descriptionItem}
          >
            <span
              className={styles.descriptionBullet}
            >
              •
            </span>

            <span className={styles.descriptionText}>
              {line}
            </span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className={styles.page}>

      <div className={styles.header}>

        <div>
          <span className={styles.eyebrow}>
            CONSELHO BLAZE
          </span>

          <h1>
            Novidades
          </h1>

          <p>
            Acompanhe as atualizações,
            melhorias e mudanças da plataforma.
          </p>
        </div>

        {isOwner && (
          <button
            type="button"
            className={styles.newButton}
            onClick={() => {
              if (showForm) {
                resetForm()
              } else {
                setShowForm(true)
              }
            }}
          >
            {showForm
              ? 'Cancelar'
              : '+ Nova atualização'}
          </button>
        )}

      </div>

      {showForm && isOwner && (
        <form
          className={styles.form}
          onSubmit={handleCreate}
        >

          <div className={styles.formHeader}>
            <div>
              <span>
                {editingId
                  ? 'EDITAR ATUALIZAÇÃO'
                  : 'PUBLICAR ATUALIZAÇÃO'}
              </span>

              <h2>
                {editingId
                  ? 'Editar patch note'
                  : 'Nova patch note'}
              </h2>
            </div>
          </div>

          <div className={styles.formGrid}>

            <label>
              <span>
                Versão
              </span>

              <input
                type="text"
                value={version}
                onChange={event =>
                  setVersion(event.target.value)
                }
                placeholder="Ex: BETA 1.1"
                maxLength={50}
                required
              />
            </label>

            <label>
              <span>
                Título
              </span>

              <input
                type="text"
                value={title}
                onChange={event =>
                  setTitle(event.target.value)
                }
                placeholder="Ex: Sistema de respostas"
                maxLength={120}
                required
              />
            </label>

          </div>

          <label>
            <span>
              Descrição
            </span>

            <textarea
              value={description}
              onChange={event =>
                setDescription(event.target.value)
              }
              placeholder={
                'Digite uma alteração por linha.\n\nExemplo:\nSistema de respostas aos comentários\nNovo botão para responder comentários\nCorreção do layout no celular'
              }
              rows={7}
              maxLength={5000}
            />
          </label>

          <div className={styles.formFooter}>

            <span>
              {editingId
                ? 'A data original da atualização será mantida.'
                : 'A data e hora serão registradas automaticamente.'}
            </span>

            <div className={styles.formActions}>

              <button
                type="button"
                className={styles.cancelButton}
                onClick={resetForm}
                disabled={saving}
              >
                Cancelar
              </button>

              <button
                type="submit"
                className={styles.publishButton}
                disabled={saving}
              >
                {saving
                  ? 'Salvando...'
                  : editingId
                    ? 'Salvar alterações'
                    : 'Publicar atualização'}
              </button>

            </div>

          </div>

        </form>
      )}

      <section className={styles.list}>

        {loading ? (
          <div className={styles.empty}>
            Carregando novidades...
          </div>
        ) : patchNotes.length === 0 ? (
          <div className={styles.empty}>
            <strong>
              Nenhuma atualização publicada.
            </strong>

            <span>
              As novidades do Conselho Blaze
              aparecerão aqui.
            </span>
          </div>
        ) : (
          patchNotes.map(patch => (
            <article
              key={patch.id}
              className={styles.patch}
            >

              <div className={styles.patchTop}>

                <div>
                  <span className={styles.version}>
                    {patch.version}
                  </span>

                  <h2>
                    {patch.title}
                  </h2>
                </div>

                <time>
                  {formatDate(
                    patch.created_at
                  )}
                </time>

              </div>

              {renderDescription(
                patch.description
              )}

              <div className={styles.signature}>

                <img
                  src={authorAvatar}
                  alt={authorUsername}
                  className={styles.signatureAvatar}
                />

                <span>
                  — @{authorUsername}
                </span>

              </div>

              {isOwner && (
                <div className={styles.patchActions}>

                  <button
                    type="button"
                    className={styles.editButton}
                    onClick={() =>
                      handleEdit(patch)
                    }
                  >
                    Editar
                  </button>

                  <button
                    type="button"
                    className={styles.deleteButton}
                    onClick={() =>
                      handleDelete(patch)
                    }
                  >
                    Excluir
                  </button>

                </div>
              )}

            </article>
          ))
        )}

      </section>

    </div>
  )
}