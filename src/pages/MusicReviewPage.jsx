import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import {
  ChevronLeftIcon,
  StarIcon,
  EditIcon,
  TrashIcon,
  SpinnerIcon,
  HeartIcon,
  FireIcon,
  ThumbUpIcon,
  ThumbDownIcon,
  MessageIcon
} from '../components/Icons'
import MusicReviewModal from '../components/MusicReviewModal'
import styles from './ReviewPage.module.css'

function Stars({ rating }) {
  const full = Math.floor(rating / 2)
  const half = rating % 2 >= 1

  return (
    <span className={styles.stars}>
      {[0, 1, 2, 3, 4].map(i => (
        <StarIcon
          key={i}
          size={18}
          filled={
            i < full ||
            (i === full && half)
          }
        />
      ))}
    </span>
  )
}

const REACTION_TYPES = [
  {
    type: 'like',
    Icon: HeartIcon,
    label: 'Curtir'
  },
  {
    type: 'fire',
    Icon: FireIcon,
    label: 'Incrível'
  },
  {
    type: 'agree',
    Icon: ThumbUpIcon,
    label: 'Concordo'
  },
  {
    type: 'disagree',
    Icon: ThumbDownIcon,
    label: 'Discordo'
  }
]

export default function MusicReviewPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [review, setReview] = useState(null)
  const [reactions, setReactions] = useState([])
  const [comments, setComments] = useState([])

  const [loading, setLoading] = useState(true)

  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [editing, setEditing] = useState(null)
  const [replyingTo, setReplyingTo] = useState(null)

  const [showEditModal, setShowEditModal] =
    useState(false)

  const fetchAll = useCallback(async () => {
    setLoading(true)

    console.log('==============================')
    console.log('BUSCANDO AVALIAÇÃO MUSICAL')
    console.log('ID:', id)
    console.log('USUÁRIO:', user?.id)
    console.log('==============================')

    /*
      =====================================================
      1. BUSCAR A AVALIAÇÃO
      =====================================================
    */

    const {
      data: musicReview,
      error: musicReviewError
    } = await supabase
      .from('music_reviews')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    console.log(
      'MUSIC REVIEW:',
      musicReview
    )

    console.log(
      'ERRO MUSIC REVIEW:',
      musicReviewError
    )

    if (musicReviewError) {
      console.error(
        'Erro ao buscar avaliação:',
        musicReviewError
      )

      setReview(null)
      setLoading(false)

      return
    }

    if (!musicReview) {
      console.error(
        'Avaliação musical não encontrada:',
        id
      )

      setReview(null)
      setReactions([])
      setComments([])
      setLoading(false)

      return
    }

    /*
      =====================================================
      2. BUSCAR PERFIL DO AUTOR
      =====================================================
    */

    const {
      data: profile,
      error: profileError
    } = await supabase
      .from('profiles')
      .select(
        'id, username, full_name, avatar_url'
      )
      .eq('id', musicReview.user_id)
      .maybeSingle()

    if (profileError) {
      console.error(
        'Erro ao buscar perfil:',
        profileError
      )
    }

    /*
      =====================================================
      3. BUSCAR REAÇÕES
      =====================================================
    */

    const {
      data: reactionRows,
      error: reactionsError
    } = await supabase
      .from('music_reactions')
      .select('*')
      .eq('music_review_id', id)

    console.log(
      'REAÇÕES ENCONTRADAS:',
      reactionRows
    )

    console.log(
      'ERRO REAÇÕES:',
      reactionsError
    )

    if (reactionsError) {
      console.error(
        'Erro ao buscar reações:',
        reactionsError
      )
    }

    /*
      =====================================================
      4. BUSCAR COMENTÁRIOS
      =====================================================
    */

    const {
      data: commentRows,
      error: commentsError
    } = await supabase
      .from('music_comments')
      .select('*')
      .eq('music_review_id', id)
      .order('created_at', {
        ascending: true
      })

    console.log(
      'COMENTÁRIOS ENCONTRADOS:',
      commentRows
    )

    console.log(
      'ERRO COMENTÁRIOS:',
      commentsError
    )

    if (commentsError) {
      console.error(
        'Erro ao buscar comentários:',
        commentsError
      )
    }

    /*
      =====================================================
      5. BUSCAR PERFIS DOS COMENTÁRIOS
      =====================================================
    */

    const commentUserIds = [
      ...new Set(
        (commentRows || [])
          .map(comment => comment.user_id)
          .filter(Boolean)
      )
    ]

    let commentProfiles = []

    if (commentUserIds.length > 0) {
      const {
        data: profiles,
        error: commentProfilesError
      } = await supabase
        .from('profiles')
        .select(
          'id, username, full_name, avatar_url'
        )
        .in('id', commentUserIds)

      if (commentProfilesError) {
        console.error(
          'Erro ao buscar perfis dos comentários:',
          commentProfilesError
        )
      }

      commentProfiles = profiles || []
    }

    /*
      =====================================================
      6. JUNTAR COMENTÁRIOS + PERFIS
      =====================================================
    */

    const formattedComments =
      (commentRows || []).map(item => {
        const profile =
          commentProfiles.find(
            p => p.id === item.user_id
          )

        return {
          ...item,

          username:
            profile?.username ||
            profile?.full_name ||
            'Usuário',

          avatar_url:
            profile?.avatar_url || null,

          profile_id:
            profile?.id ||
            item.user_id
        }
      })

    /*
      =====================================================
      7. BUSCAR PERFIS DAS REAÇÕES
      =====================================================
    */

    const reactionUserIds = [
      ...new Set(
        (reactionRows || [])
          .map(reaction => reaction.user_id)
          .filter(Boolean)
      )
    ]

    let reactionProfiles = []

    if (reactionUserIds.length > 0) {
      const {
        data: profiles,
        error: reactionProfilesError
      } = await supabase
        .from('profiles')
        .select(
          'id, username, avatar_url'
        )
        .in('id', reactionUserIds)

      if (reactionProfilesError) {
        console.error(
          'Erro ao buscar perfis das reações:',
          reactionProfilesError
        )
      }

      reactionProfiles = profiles || []
    }

    /*
      =====================================================
      8. JUNTAR REAÇÕES + PERFIS
      =====================================================
    */

    const formattedReactions =
      (reactionRows || []).map(item => {
        const profile =
          reactionProfiles.find(
            p => p.id === item.user_id
          )

        return {
          ...item,
          profiles: profile || null
        }
      })

    /*
      =====================================================
      9. ATUALIZAR ESTADO
      =====================================================
    */

    setReview({
      ...musicReview,

      username:
        profile?.username ||
        profile?.full_name ||
        'Usuário',

      avatar_url:
        profile?.avatar_url || null,

      profile_id:
        profile?.id ||
        musicReview.user_id
    })

    setReactions(
      formattedReactions
    )

    setComments(
      formattedComments
    )

    console.log(
      'COMENTÁRIOS FORMATADOS:',
      formattedComments
    )

    console.log(
      'REAÇÕES FORMATADAS:',
      formattedReactions
    )

    setLoading(false)
  }, [id, user?.id])

  /*
    =====================================================
    CARREGAR DADOS
    =====================================================
  */

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  /*
    =====================================================
    REALTIME
    =====================================================
  */

  useEffect(() => {
    if (!id) return

    const channel = supabase
      .channel(`music-review-${id}`)

      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'music_comments',
          filter:
            `music_review_id=eq.${id}`
        },
        () => {
          fetchAll()
        }
      )

      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'music_reactions',
          filter:
            `music_review_id=eq.${id}`
        },
        () => {
          fetchAll()
        }
      )

      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [id, fetchAll])

  /*
    =====================================================
    COMENTÁRIO
    =====================================================
  */

  const submitComment = async () => {
    if (!comment.trim() || !user) {
      return
    }

    setSubmitting(true)

    if (editing) {
      const { error } = await supabase
        .from('music_comments')
        .update({
          content: comment.trim()
        })
        .eq('id', editing)

      if (error) {
        console.error(
          'Erro ao editar comentário:',
          error
        )
      }

      setEditing(null)
    } else {
      const { error } = await supabase
        .from('music_comments')
        .insert({
          music_review_id: id,
          user_id: user.id,
          content: comment.trim(),
          parent_id:
            replyingTo || null
        })

      if (error) {
        console.error(
          'Erro ao criar comentário:',
          error
        )
      }

      setReplyingTo(null)
    }

    setComment('')
    setSubmitting(false)

    fetchAll()
  }

  /*
    =====================================================
    EXCLUIR COMENTÁRIO
    =====================================================
  */

  const deleteComment = async commentId => {
    if (
      !confirm(
        'Excluir comentário?'
      )
    ) {
      return
    }

    const { error } = await supabase
      .from('music_comments')
      .delete()
      .eq('id', commentId)

    if (error) {
      console.error(
        'Erro ao excluir comentário:',
        error
      )
    }

    fetchAll()
  }

  /*
    =====================================================
    EXCLUIR AVALIAÇÃO
    =====================================================
  */

  const deleteReview = async () => {
    if (
      !confirm(
        'Excluir esta avaliação permanentemente?'
      )
    ) {
      return
    }

    const { error } = await supabase
      .from('music_reviews')
      .delete()
      .eq('id', id)

    if (error) {
      console.error(
        'Erro ao excluir avaliação:',
        error
      )

      return
    }

    navigate('/musicas')
  }

  /*
    =====================================================
    REAÇÕES
    =====================================================
  */

  const handleReaction = async type => {
    if (!user) return

    const existing =
      reactions.find(
        reaction =>
          reaction.user_id ===
            user.id &&
          reaction.type === type
      )

    if (existing) {
      const { error } =
        await supabase
          .from('music_reactions')
          .delete()
          .eq(
            'id',
            existing.id
          )

      if (error) {
        console.error(
          'Erro ao remover reação:',
          error
        )
      }
    } else {
      const { error } =
        await supabase
          .from('music_reactions')
          .insert({
            music_review_id: id,
            user_id: user.id,
            type
          })

      if (error) {
        console.error(
          'Erro ao adicionar reação:',
          error
        )
      }
    }

    fetchAll()
  }

  /*
    =====================================================
    RESPOSTA
    =====================================================
  */

  const startReply = commentId => {
    setReplyingTo(commentId)
    setEditing(null)
    setComment('')
  }

  const cancelReply = () => {
    setReplyingTo(null)
    setComment('')
  }

  /*
    =====================================================
    EDITAR COMENTÁRIO
    =====================================================
  */

  const startEditing = (
    commentId,
    content
  ) => {
    setEditing(commentId)
    setReplyingTo(null)
    setComment(content)
  }

  /*
    =====================================================
    LOADING
    =====================================================
  */

  if (loading) {
    return (
      <div className={styles.center}>
        <SpinnerIcon size={28} />
      </div>
    )
  }

  /*
    =====================================================
    NÃO ENCONTRADO
    =====================================================
  */

  if (!review) {
    return (
      <div className={styles.center}>
        Avaliação musical não encontrada.
      </div>
    )
  }

  /*
    =====================================================
    DADOS VISUAIS
    =====================================================
  */

  const ratingColor =
    review.rating >= 8
      ? '#16a34a'
      : review.rating >= 6
        ? '#ca8a04'
        : '#dc2626'

  const isOwner =
    user?.id === review.user_id

  /*
    =====================================================
    PESSOAS QUE REAGIRAM
    =====================================================
  */

  const uniqueReactionPeople =
    Array.from(
      new Map(
        reactions
          .filter(
            reaction =>
              reaction.profiles
          )
          .map(reaction => [
            reaction.user_id,
            reaction.profiles
          ])
      ).values()
    )

  const visibleReactionPeople =
    uniqueReactionPeople.slice(
      0,
      5
    )

  const extraReactionCount =
    Math.max(
      uniqueReactionPeople.length -
        visibleReactionPeople.length,
      0
    )

  const uniqueReactionCount =
    uniqueReactionPeople.length

  /*
    =====================================================
    COMENTÁRIOS PRINCIPAIS
    =====================================================
  */

  const mainComments =
    comments.filter(
      item => !item.parent_id
    )

  const getReplies = commentId => {
    return comments.filter(
      item =>
        item.parent_id ===
        commentId
    )
  }

  /*
    =====================================================
    RENDER
    =====================================================
  */

  return (
    <div className={styles.page}>

      <button
        className={styles.back}
        onClick={() => navigate(-1)}
      >
        <ChevronLeftIcon size={18} />
        Voltar
      </button>

      <article
        className={styles.reviewCard}
      >

        <div
          className={styles.reviewTop}
        >

          <div className={styles.tags}>

            <span
              className={styles.genre}
            >
              {review.genre}
            </span>

            {review.album_name && (
              <span
                className={styles.type}
              >
                {review.album_name}
              </span>
            )}

          </div>

          {isOwner && (
            <div
              className={
                styles.ownerActions
              }
            >

              <button
                onClick={() =>
                  setShowEditModal(
                    true
                  )
                }
                className={
                  styles.iconBtn
                }
                title="Editar"
              >
                <EditIcon size={16} />
              </button>

              <button
                onClick={deleteReview}
                className={`${styles.iconBtn} ${styles.danger}`}
                title="Excluir"
              >
                <TrashIcon size={16} />
              </button>

            </div>
          )}

        </div>

        <div
          className={styles.ratingRow}
        >

          {review.music_image && (
            <img
              src={review.music_image}
              alt={`Capa de ${review.music_name}`}
              className={
                styles.gameCover
              }
            />
          )}

          <div
            className={
              styles.ratingBig
            }
            style={{
              color: ratingColor
            }}
          >
            {Number(
              review.rating
            ).toFixed(1)}
          </div>

          <div>

            <h1
              className={
                styles.gameName
              }
            >
              {review.music_name}
            </h1>

            <Stars
              rating={Number(
                review.rating
              )}
            />

            <div
              className={
                styles.platinado
              }
            >
              {review.artist_name}
            </div>

          </div>

        </div>

        <p
          className={styles.comment}
        >
          {review.comment}
        </p>

        <div
          className={
            styles.reviewFooter
          }
        >

          <Link
            to={`/profile/${review.profile_id}`}
            className={
              styles.author
            }
          >

            <div
              className={
                styles.avatar
              }
            >

              {review.avatar_url ? (
                <img
                  src={review.avatar_url}
                  alt=""
                />
              ) : (
                <span>
                  {(
                    review.username ||
                    '?'
                  )[0].toUpperCase()}
                </span>
              )}

            </div>

            <div>

              <span
                className={
                  styles.authorName
                }
              >
                {review.username}
              </span>

              <span
                className={
                  styles.date
                }
              >
                {new Date(
                  review.created_at
                ).toLocaleDateString(
                  'pt-BR',
                  {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric'
                  }
                )}
              </span>

            </div>

          </Link>

          <div
            className={
              styles.reactionBar
            }
          >

            {REACTION_TYPES.map(
              ({
                type,
                Icon,
                label
              }) => {

                const count =
                  reactions.filter(
                    reaction =>
                      reaction.type ===
                      type
                  ).length

                const active =
                  reactions.some(
                    reaction =>
                      reaction.user_id ===
                        user?.id &&
                      reaction.type ===
                        type
                  )

                return (
                  <button
                    key={type}
                    className={`${styles.reactionBtn} ${
                      active
                        ? styles.active
                        : ''
                    }`}
                    onClick={() =>
                      handleReaction(
                        type
                      )
                    }
                    title={label}
                  >

                    <Icon size={16} />

                    <span>
                      {label}
                    </span>

                    {count > 0 && (
                      <strong>
                        {count}
                      </strong>
                    )}

                  </button>
                )
              }
            )}

          </div>

        </div>

        {visibleReactionPeople.length >
          0 && (

          <div
            className={
              styles.reactionPeople
            }
          >

            <div
              className={
                styles.reactionAvatars
              }
            >

              {visibleReactionPeople.map(
                profile => (

                  <Link
                    key={profile.id}
                    to={`/profile/${profile.id}`}
                    className={
                      styles.reactionPerson
                    }
                    title={
                      profile.username
                    }
                  >

                    {profile.avatar_url ? (
                      <img
                        src={
                          profile.avatar_url
                        }
                        alt={
                          profile.username
                        }
                      />
                    ) : (
                      <span>
                        {(
                          profile.username ||
                          '?'
                        )[0].toUpperCase()}
                      </span>
                    )}

                  </Link>

                )
              )}

              {extraReactionCount >
                0 && (
                <div
                  className={
                    styles.reactionMore
                  }
                >
                  +{extraReactionCount}
                </div>
              )}

            </div>

            <span
              className={
                styles.reactionPeopleText
              }
            >
              {uniqueReactionCount ===
              1
                ? '1 pessoa reagiu'
                : `${uniqueReactionCount} pessoas reagiram`}
            </span>

          </div>
        )}

      </article>

      <section
        className={
          styles.commentsSection
        }
      >

        <h3
          className={
            styles.commentsTitle
          }
        >

          <MessageIcon size={18} />

          {comments.length}{' '}

          {comments.length === 1
            ? 'comentário'
            : 'comentários'}

        </h3>

        <div
          className={
            styles.commentInput
          }
        >

          {replyingTo && (
            <div
              className={
                styles.replyingTo
              }
            >

              Respondendo a @
              {
                comments.find(
                  item =>
                    item.id ===
                    replyingTo
                )?.username
              }

              <button
                onClick={
                  cancelReply
                }
              >
                Cancelar
              </button>

            </div>
          )}

          {editing && (
            <div
              className={
                styles.editingComment
              }
            >
              Editando comentário

              <button
                onClick={() => {
                  setEditing(null)
                  setComment('')
                }}
              >
                Cancelar
              </button>

            </div>
          )}

          <textarea
            placeholder={
              replyingTo
                ? 'Escreva sua resposta...'
                : editing
                  ? 'Edite seu comentário...'
                  : 'Escreva um comentário...'
            }
            value={comment}
            onChange={e =>
              setComment(
                e.target.value
              )
            }
            rows={3}
            className={
              styles.textarea
            }
          />

          <div
            className={
              styles.commentActions
            }
          >

            <button
              className={
                styles.submitBtn
              }
              onClick={
                submitComment
              }
              disabled={
                submitting ||
                !comment.trim()
              }
            >

              {submitting ? (
                <SpinnerIcon size={16} />
              ) : editing ? (
                'Salvar'
              ) : replyingTo ? (
                'Responder'
              ) : (
                'Comentar'
              )}

            </button>

          </div>

        </div>

        <div
          className={
            styles.commentList
          }
        >

          {mainComments.map(
            currentComment => {

              const replies =
                getReplies(
                  currentComment.id
                )

              return (
                <div
                  key={
                    currentComment.id
                  }
                  className={
                    styles.commentGroup
                  }
                >

                  <div
                    className={
                      styles.commentItem
                    }
                  >

                    <Link
                      to={`/profile/${currentComment.profile_id}`}
                      className={
                        styles.commentAvatar
                      }
                    >

                      {currentComment.avatar_url ? (
                        <img
                          src={
                            currentComment.avatar_url
                          }
                          alt=""
                        />
                      ) : (
                        <span>
                          {(
                            currentComment.username ||
                            '?'
                          )[0].toUpperCase()}
                        </span>
                      )}

                    </Link>

                    <div
                      className={
                        styles.commentBody
                      }
                    >

                      <div
                        className={
                          styles.commentHead
                        }
                      >

                        <Link
                          to={`/profile/${currentComment.profile_id}`}
                          className={
                            styles.commentUser
                          }
                        >
                          {
                            currentComment.username
                          }
                        </Link>

                        <span
                          className={
                            styles.commentDate
                          }
                        >
                          {new Date(
                            currentComment.created_at
                          ).toLocaleDateString(
                            'pt-BR'
                          )}
                        </span>

                        {user?.id ===
                          currentComment.user_id && (
                          <div
                            className={
                              styles.commentOwner
                            }
                          >

                            <button
                              onClick={() =>
                                startEditing(
                                  currentComment.id,
                                  currentComment.content
                                )
                              }
                              className={
                                styles.iconBtn
                              }
                            >
                              <EditIcon
                                size={13}
                              />
                            </button>

                            <button
                              onClick={() =>
                                deleteComment(
                                  currentComment.id
                                )
                              }
                              className={`${styles.iconBtn} ${styles.danger}`}
                            >
                              <TrashIcon
                                size={13}
                              />
                            </button>

                          </div>
                        )}

                      </div>

                      <p
                        className={
                          styles.commentText
                        }
                      >
                        {
                          currentComment.content
                        }
                      </p>

                      <button
                        className={
                          styles.replyBtn
                        }
                        onClick={() =>
                          startReply(
                            currentComment.id
                          )
                        }
                      >
                        Responder
                      </button>

                    </div>

                  </div>

                  {replies.length >
                    0 && (

                    <div
                      className={
                        styles.replies
                      }
                    >

                      {replies.map(
                        reply => (

                          <div
                            key={reply.id}
                            className={
                              styles.commentItem
                            }
                          >

                            <Link
                              to={`/profile/${reply.profile_id}`}
                              className={
                                styles.commentAvatar
                              }
                            >

                              {reply.avatar_url ? (
                                <img
                                  src={
                                    reply.avatar_url
                                  }
                                  alt=""
                                />
                              ) : (
                                <span>
                                  {(
                                    reply.username ||
                                    '?'
                                  )[0].toUpperCase()}
                                </span>
                              )}

                            </Link>

                            <div
                              className={
                                styles.commentBody
                              }
                            >

                              <div
                                className={
                                  styles.commentHead
                                }
                              >

                                <Link
                                  to={`/profile/${reply.profile_id}`}
                                  className={
                                    styles.commentUser
                                  }
                                >
                                  {
                                    reply.username
                                  }
                                </Link>

                                <span
                                  className={
                                    styles.commentDate
                                  }
                                >
                                  {new Date(
                                    reply.created_at
                                  ).toLocaleDateString(
                                    'pt-BR'
                                  )}
                                </span>

                                {user?.id ===
                                  reply.user_id && (
                                  <div
                                    className={
                                      styles.commentOwner
                                    }
                                  >

                                    <button
                                      onClick={() =>
                                        startEditing(
                                          reply.id,
                                          reply.content
                                        )
                                      }
                                      className={
                                        styles.iconBtn
                                      }
                                    >
                                      <EditIcon
                                        size={13}
                                      />
                                    </button>

                                    <button
                                      onClick={() =>
                                        deleteComment(
                                          reply.id
                                        )
                                      }
                                      className={`${styles.iconBtn} ${styles.danger}`}
                                    >
                                      <TrashIcon
                                        size={13}
                                      />
                                    </button>

                                  </div>
                                )}

                              </div>

                              <p
                                className={
                                  styles.commentText
                                }
                              >
                                {
                                  reply.content
                                }
                              </p>

                            </div>

                          </div>

                        )
                      )}

                    </div>
                  )}

                </div>
              )
            }
          )}

        </div>

      </section>

      {showEditModal && (
        <MusicReviewModal
          existing={review}
          onClose={saved => {
            setShowEditModal(false)

            if (saved) {
              fetchAll()
            }
          }}
        />
      )}

    </div>
  )
}