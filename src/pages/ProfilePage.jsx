import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import {
  ChevronLeftIcon,
  SpinnerIcon,
  EditIcon
} from '../components/Icons'
import ReviewCard from '../components/ReviewCard'
import styles from './ProfilePage.module.css'

export default function ProfilePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, updateProfile } = useAuth()

  const [profile, setProfile] = useState(null)
  const [reviews, setReviews] = useState([])
  const [reactions, setReactions] = useState([])

  const [followersCount, setFollowersCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)

  const [userList, setUserList] = useState([])
  const [userListType, setUserListType] = useState(null)
  const [loadingUserList, setLoadingUserList] = useState(false)

  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)

  const [form, setForm] = useState({
    username: '',
    full_name: '',
    bio: '',
    avatar_url: '',
    banner_url: ''
  })

  const [saving, setSaving] = useState(false)

  const isMe = user?.id === id

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true)

      const { data: p, error: profileError } =
        await supabase
          .from('profiles')
          .select('*')
          .eq('id', id)
          .single()

      if (profileError) {
        console.error(
          'Erro ao buscar perfil:',
          profileError
        )
      }

      setProfile(p)

      if (p) {
        setForm({
          username: p.username || '',
          full_name: p.full_name || '',
          bio: p.bio || '',
          avatar_url: p.avatar_url || '',
          banner_url: p.banner_url || ''
        })
      }

      const { data: rv, error: reviewsError } =
        await supabase
          .from('reviews')
          .select(
            '*, profiles:user_id(username, full_name, avatar_url)'
          )
          .eq('user_id', id)
          .order('created_at', {
            ascending: false
          })

      if (reviewsError) {
        console.error(
          'Erro ao buscar avaliações:',
          reviewsError
        )
      }

      const mapped = (rv || []).map(r => ({
        ...r,
        username: r.profiles?.username,
        avatar_url: r.profiles?.avatar_url,
        comment_count: 0
      }))

      setReviews(mapped)

      const ids = (rv || []).map(r => r.id)

      if (ids.length) {
        const { data: rcts, error: reactionsError } =
          await supabase
            .from('reactions')
            .select('*')
            .in('review_id', ids)

        if (reactionsError) {
          console.error(
            'Erro ao buscar reações:',
            reactionsError
          )
        }

        setReactions(rcts || [])
      } else {
        setReactions([])
      }

      const { count: followers } = await supabase
        .from('seguidores')
        .select('*', {
          count: 'exact',
          head: true
        })
        .eq('seguido_id', id)

      setFollowersCount(followers || 0)

      const { count: following } = await supabase
        .from('seguidores')
        .select('*', {
          count: 'exact',
          head: true
        })
        .eq('seguidor_id', id)

      setFollowingCount(following || 0)

      if (user && !isMe) {
        const { data: follow } = await supabase
          .from('seguidores')
          .select('id')
          .eq('seguidor_id', user.id)
          .eq('seguido_id', id)
          .maybeSingle()

        setIsFollowing(!!follow)
      } else {
        setIsFollowing(false)
      }

      setLoading(false)
    }

    fetchProfile()
  }, [id, user?.id])

  const openUserList = async type => {
    setUserListType(type)
    setLoadingUserList(true)
    setUserList([])

    const column =
      type === 'followers'
        ? 'seguido_id'
        : 'seguidor_id'

    const targetColumn =
      type === 'followers'
        ? 'seguidor_id'
        : 'seguido_id'

    const { data: follows, error } = await supabase
      .from('seguidores')
      .select(targetColumn)
      .eq(column, id)

    if (error) {
      console.error(
        'Erro ao buscar relacionamentos:',
        error
      )

      setLoadingUserList(false)
      return
    }

    const userIds = (follows || []).map(
      item => item[targetColumn]
    )

    if (!userIds.length) {
      setUserList([])
      setLoadingUserList(false)
      return
    }

    const {
      data: profiles,
      error: profilesError
    } = await supabase
      .from('profiles')
      .select(
        'id, username, full_name, avatar_url'
      )
      .in('id', userIds)

    if (profilesError) {
      console.error(
        'Erro ao buscar perfis:',
        profilesError
      )

      setUserList([])
    } else {
      setUserList(profiles || [])
    }

    setLoadingUserList(false)
  }

  const handleFollow = async () => {
    if (!user || isMe || followLoading) return

    setFollowLoading(true)

    if (isFollowing) {
      const { error } = await supabase
        .from('seguidores')
        .delete()
        .eq('seguidor_id', user.id)
        .eq('seguido_id', id)

      if (!error) {
        setIsFollowing(false)

        setFollowersCount(prev =>
          Math.max(0, prev - 1)
        )
      } else {
        console.error(
          'Erro ao deixar de seguir:',
          error
        )
      }
    } else {
      const { error } = await supabase
        .from('seguidores')
        .insert({
          seguidor_id: user.id,
          seguido_id: id
        })

      if (!error) {
        setIsFollowing(true)
        setFollowersCount(prev => prev + 1)
      } else {
        console.error(
          'Erro ao seguir usuário:',
          error
        )
      }
    }

    setFollowLoading(false)
  }

  const handleEditStart = () => {
    setForm({
      username: profile.username || '',
      full_name: profile.full_name || '',
      bio: profile.bio || '',
      avatar_url: profile.avatar_url || '',
      banner_url: profile.banner_url || ''
    })

    setEditing(true)
  }

  const handleCancelEdit = () => {
    setForm({
      username: profile.username || '',
      full_name: profile.full_name || '',
      bio: profile.bio || '',
      avatar_url: profile.avatar_url || '',
      banner_url: profile.banner_url || ''
    })

    setEditing(false)
  }

  const handleSave = async () => {
    setSaving(true)

    const cleanForm = {
      username: form.username.trim(),
      full_name: form.full_name.trim(),
      bio: form.bio.trim(),
      avatar_url: form.avatar_url.trim(),
      banner_url: form.banner_url.trim()
    }

    const { data, error } =
      await updateProfile(cleanForm)

    if (!error) {
      setProfile(data)
      setForm({
        username: data?.username || '',
        full_name: data?.full_name || '',
        bio: data?.bio || '',
        avatar_url: data?.avatar_url || '',
        banner_url: data?.banner_url || ''
      })

      setEditing(false)
    } else {
      console.error(
        'Erro ao atualizar perfil:',
        error
      )
    }

    setSaving(false)
  }

  if (loading) {
    return (
      <div className={styles.center}>
        <SpinnerIcon size={28} />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className={styles.center}>
        Perfil não encontrado.
      </div>
    )
  }

  const avgRating = reviews.length
    ? (
        reviews.reduce(
          (s, r) => s + r.rating,
          0
        ) / reviews.length
      ).toFixed(1)
    : null

  const memberSince = profile.created_at
    ? new Date(
        profile.created_at
      ).toLocaleDateString(
        'pt-BR',
        {
          day: '2-digit',
          month: 'long',
          year: 'numeric'
        }
      )
    : null

  return (
    <div className={styles.page}>

      <button
        className={styles.back}
        onClick={() => navigate(-1)}
      >
        <ChevronLeftIcon size={18} />
        Voltar
      </button>

      <div className={styles.profileCard}>

        {/* BANNER */}

        <div
          className={styles.profileBanner}
          style={
            profile.banner_url
              ? {
                  backgroundImage: `url("${profile.banner_url}")`
                }
              : undefined
          }
        >
          {!profile.banner_url && (
            <div
              className={
                styles.bannerPlaceholder
              }
            />
          )}
        </div>

        {/* CONTEÚDO */}

        <div className={styles.profileContent}>

          {/* AVATAR */}

          <div className={styles.avatarBig}>
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt=""
              />
            ) : (
              <span>
                {(
                  profile.username || '?'
                )[0].toUpperCase()}
              </span>
            )}
          </div>

          {!editing ? (

            /* =========================
               PERFIL NORMAL
            ========================= */

            <div className={styles.profileInfo}>

              <div className={styles.nameRow}>

                <div className={styles.nameBlock}>

                  <h1
                    className={
                      styles.displayName
                    }
                  >
                    {profile.full_name ||
                      profile.username}
                  </h1>

                  <p
                    className={
                      styles.username
                    }
                  >
                    @{profile.username}
                  </p>

                </div>

                {isMe ? (
                  <button
                    className={
                      styles.editBtn
                    }
                    onClick={
                      handleEditStart
                    }
                  >
                    <EditIcon size={16} />
                    Editar perfil
                  </button>
                ) : (
                  <button
                    className={`${styles.followBtn} ${
                      isFollowing
                        ? styles.followingBtn
                        : ''
                    }`}
                    onClick={
                      handleFollow
                    }
                    disabled={
                      followLoading
                    }
                  >
                    {followLoading ? (
                      <SpinnerIcon size={15} />
                    ) : (
                      isFollowing
                        ? 'Seguindo'
                        : 'Seguir'
                    )}
                  </button>
                )}

              </div>

              {profile.bio && (
                <p className={styles.bio}>
                  {profile.bio}
                </p>
              )}

              {memberSince && (
                <p
                  className={
                    styles.memberSince
                  }
                >
                  Membro desde {memberSince}
                </p>
              )}

              <div className={styles.stats}>

                <div className={styles.stat}>

                  <span
                    className={
                      styles.statNum
                    }
                  >
                    {reviews.length}
                  </span>

                  <span
                    className={
                      styles.statLabel
                    }
                  >
                    avaliações
                  </span>

                </div>

                <button
                  className={
                    styles.statButton
                  }
                  onClick={() =>
                    openUserList(
                      'followers'
                    )
                  }
                >
                  <span
                    className={
                      styles.statNum
                    }
                  >
                    {followersCount}
                  </span>

                  <span
                    className={
                      styles.statLabel
                    }
                  >
                    seguidores
                  </span>
                </button>

                <button
                  className={
                    styles.statButton
                  }
                  onClick={() =>
                    openUserList(
                      'following'
                    )
                  }
                >
                  <span
                    className={
                      styles.statNum
                    }
                  >
                    {followingCount}
                  </span>

                  <span
                    className={
                      styles.statLabel
                    }
                  >
                    seguindo
                  </span>
                </button>

                {avgRating && (
                  <div
                    className={
                      styles.stat
                    }
                  >
                    <span
                      className={
                        styles.statNum
                      }
                    >
                      {avgRating}
                    </span>

                    <span
                      className={
                        styles.statLabel
                      }
                    >
                      média
                    </span>
                  </div>
                )}

              </div>

            </div>

          ) : (

            /* =========================
               EDITAR PERFIL
            ========================= */

            <div className={styles.editForm}>

              <div
                className={
                  styles.editHeader
                }
              >
                <div>

                  <h2
                    className={
                      styles.editTitle
                    }
                  >
                    Editar perfil
                  </h2>

                  <p
                    className={
                      styles.editSubtitle
                    }
                  >
                    Personalize as informações
                    que aparecem no seu perfil.
                  </p>

                </div>
              </div>

              {/* PERFIL */}

              <div
                className={
                  styles.editSection
                }
              >

                <div
                  className={
                    styles.editSectionHeader
                  }
                >
                  <h3>Perfil</h3>

                  <span>
                    Informações básicas da
                    sua conta
                  </span>
                </div>

                <div
                  className={
                    styles.editFields
                  }
                >

                  <div
                    className={
                      styles.field
                    }
                  >

                    <label>
                      Nome completo
                    </label>

                    <input
                      placeholder="Seu nome"
                      value={
                        form.full_name
                      }
                      onChange={e =>
                        setForm(f => ({
                          ...f,
                          full_name:
                            e.target.value
                        }))
                      }
                      className={
                        styles.input
                      }
                    />

                  </div>

                  <div
                    className={
                      styles.field
                    }
                  >

                    <label>
                      Nome de usuário
                    </label>

                    <input
                      placeholder="username"
                      value={
                        form.username
                      }
                      onChange={e =>
                        setForm(f => ({
                          ...f,
                          username:
                            e.target.value
                        }))
                      }
                      className={
                        styles.input
                      }
                    />

                    <span
                      className={
                        styles.fieldHint
                      }
                    >
                      Esse nome será exibido
                      como @
                      {form.username ||
                        'username'}
                    </span>

                  </div>

                </div>

              </div>

              {/* IMAGENS */}

              <div
                className={
                  styles.editSection
                }
              >

                <div
                  className={
                    styles.editSectionHeader
                  }
                >
                  <h3>Imagens</h3>

                  <span>
                    Personalize seu avatar
                    e banner
                  </span>
                </div>

                <div
                  className={
                    styles.imageEditGrid
                  }
                >

                  {/* AVATAR */}

                  <div
                    className={
                      styles.imageEditCard
                    }
                  >

                    <div
                      className={
                        styles.imageEditTitle
                      }
                    >
                      <strong>
                        Avatar
                      </strong>

                      <span>
                        Foto do perfil
                      </span>
                    </div>

                    <div
                      className={
                        styles.avatarEditPreview
                      }
                    >
                      {form.avatar_url ? (
                        <img
                          src={
                            form.avatar_url
                          }
                          alt="Prévia do avatar"
                        />
                      ) : (
                        <span>
                          {(
                            form.username ||
                            '?'
                          )[0].toUpperCase()}
                        </span>
                      )}
                    </div>

                    <input
                      placeholder="URL da foto ou GIF"
                      value={
                        form.avatar_url
                      }
                      onChange={e =>
                        setForm(f => ({
                          ...f,
                          avatar_url:
                            e.target.value
                        }))
                      }
                      className={
                        styles.input
                      }
                    />

                  </div>

                  {/* BANNER */}

                  <div
                    className={
                      styles.imageEditCard
                    }
                  >

                    <div
                      className={
                        styles.imageEditTitle
                      }
                    >
                      <strong>
                        Banner
                      </strong>

                      <span>
                        Imagem exibida no
                        topo do perfil
                      </span>
                    </div>

                    <div
                      className={
                        styles.bannerEditPreview
                      }
                    >
                      {form.banner_url ? (
                        <img
                          src={
                            form.banner_url
                          }
                          alt="Prévia do banner"
                        />
                      ) : (
                        <div
                          className={
                            styles.bannerEditPlaceholder
                          }
                        >
                          Sem banner
                        </div>
                      )}
                    </div>

                    <input
                      placeholder="URL do banner"
                      value={
                        form.banner_url
                      }
                      onChange={e =>
                        setForm(f => ({
                          ...f,
                          banner_url:
                            e.target.value
                        }))
                      }
                      className={
                        styles.input
                      }
                    />

                  </div>

                </div>

              </div>

              {/* BIO */}

              <div
                className={
                  styles.editSection
                }
              >

                <div
                  className={
                    styles.editSectionHeader
                  }
                >
                  <h3>
                    Sobre você
                  </h3>

                  <span>
                    Conte um pouco sobre
                    você
                  </span>
                </div>

                <div
                  className={
                    styles.field
                  }
                >

                  <label>Bio</label>

                  <textarea
                    placeholder="Escreva algo sobre você..."
                    value={form.bio}
                    onChange={e =>
                      setForm(f => ({
                        ...f,
                        bio: e.target.value
                      }))
                    }
                    className={
                      styles.textarea
                    }
                    rows={4}
                  />

                  <span
                    className={
                      styles.fieldHint
                    }
                  >
                    Sua bio aparecerá abaixo
                    do seu nome no perfil.
                  </span>

                </div>

              </div>

              {/* AÇÕES */}

              <div
                className={
                  styles.editActions
                }
              >

                <button
                  onClick={
                    handleCancelEdit
                  }
                  className={
                    styles.cancelBtn
                  }
                >
                  Cancelar
                </button>

                <button
                  onClick={handleSave}
                  disabled={saving}
                  className={
                    styles.saveBtn
                  }
                >
                  {saving ? (
                    <SpinnerIcon size={16} />
                  ) : (
                    'Salvar alterações'
                  )}
                </button>

              </div>

            </div>
          )}

        </div>

      </div>

      {/* AVALIAÇÕES */}

      {reviews.length > 0 && (
        <div
          className={
            styles.reviewsSection
          }
        >

          <h2
            className={
              styles.sectionTitle
            }
          >
            Avaliações
          </h2>

          <div className={styles.grid}>

            {reviews.map(r => (
              <ReviewCard
                key={r.id}
                review={r}
                reactions={reactions.filter(
                  rx =>
                    rx.review_id === r.id
                )}
              />
            ))}

          </div>

        </div>
      )}

      {reviews.length === 0 &&
        !loading && (
          <p className={styles.empty}>
            Nenhuma avaliação publicada
            ainda.
          </p>
        )}

      {/* MODAL DE SEGUIDORES */}

      {userListType && (
        <div
          className={
            styles.modalOverlay
          }
          onClick={() =>
            setUserListType(null)
          }
        >

          <div
            className={
              styles.userListModal
            }
            onClick={e =>
              e.stopPropagation()
            }
          >

            <div
              className={
                styles.userListHeader
              }
            >

              <div>

                <h3>
                  {userListType ===
                  'followers'
                    ? 'Seguidores'
                    : 'Seguindo'}
                </h3>

                <span>
                  {userList.length}{' '}
                  {userList.length === 1
                    ? 'usuário'
                    : 'usuários'}
                </span>

              </div>

              <button
                className={
                  styles.closeModal
                }
                onClick={() =>
                  setUserListType(null)
                }
              >
                ×
              </button>

            </div>

            <div
              className={
                styles.userList
              }
            >

              {loadingUserList ? (
                <div
                  className={
                    styles.userListLoading
                  }
                >
                  <SpinnerIcon size={22} />
                </div>
              ) : userList.length === 0 ? (
                <div
                  className={
                    styles.userListEmpty
                  }
                >
                  {userListType ===
                  'followers'
                    ? 'Nenhum seguidor ainda.'
                    : 'Não segue ninguém ainda.'}
                </div>
              ) : (
                userList.map(profile => (
                  <button
                    key={profile.id}
                    className={
                      styles.userListItem
                    }
                    onClick={() => {
                      setUserListType(
                        null
                      )

                      navigate(
                        `/profile/${profile.id}`
                      )
                    }}
                  >

                    <div
                      className={
                        styles.userListAvatar
                      }
                    >
                      {profile.avatar_url ? (
                        <img
                          src={
                            profile.avatar_url
                          }
                          alt=""
                        />
                      ) : (
                        <span>
                          {(
                            profile.username ||
                            '?'
                          )[0].toUpperCase()}
                        </span>
                      )}
                    </div>

                    <div
                      className={
                        styles.userListInfo
                      }
                    >

                      <strong>
                        {profile.full_name ||
                          profile.username}
                      </strong>

                      <span>
                        @{profile.username}
                      </span>

                    </div>

                  </button>
                ))
              )}

            </div>

          </div>

        </div>
      )}

    </div>
  )
}