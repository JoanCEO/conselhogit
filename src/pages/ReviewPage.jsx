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
import ReviewModal from '../components/ReviewModal'
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
          filled={i < full || (i === full && half)}
        />
      ))}
    </span>
  )
}

const REACTION_TYPES = [
  { type: 'like', Icon: HeartIcon, label: 'Curtir' },
  { type: 'fire', Icon: FireIcon, label: 'Incrível' },
  { type: 'agree', Icon: ThumbUpIcon, label: 'Concordo' },
  { type: 'disagree', Icon: ThumbDownIcon, label: 'Discordo' },
]

export default function ReviewPage() {
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
  const [showEditModal, setShowEditModal] = useState(false)

  const fetchAll = useCallback(async () => {
    const [{ data: rv }, { data: rcts }, { data: cmts }] = await Promise.all([
      supabase
        .from('reviews')
        .select('*, profiles:user_id(id, username, full_name, avatar_url)')
        .eq('id', id)
        .single(),

      supabase
        .from('reactions')
        .select(`
          *,
          profiles:user_id (
            id,
            username,
            avatar_url
          )
        `)
        .eq('review_id', id),

      supabase
        .from('comments')
        .select('*, profiles:user_id(id, username, avatar_url)')
        .eq('review_id', id)
        .order('created_at'),
    ])

    if (rv) {
      setReview({
        ...rv,
        username: rv.profiles?.username,
        avatar_url: rv.profiles?.avatar_url,
        profile_id: rv.profiles?.id
      })
    }

    setReactions(rcts || [])

    setComments(
      (cmts || []).map(c => ({
        ...c,
        username: c.profiles?.username,
        avatar_url: c.profiles?.avatar_url,
        profile_id: c.profiles?.id
      }))
    )

    setLoading(false)
  }, [id])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  useEffect(() => {
    const channel = supabase
      .channel(`review-${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comments',
          filter: `review_id=eq.${id}`
        },
        fetchAll
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reactions',
          filter: `review_id=eq.${id}`
        },
        fetchAll
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [id, fetchAll])

  const submitComment = async () => {
    if (!comment.trim()) return

    setSubmitting(true)

    if (editing) {
      await supabase
        .from('comments')
        .update({ content: comment })
        .eq('id', editing)

      setEditing(null)
    } else {
      await supabase
        .from('comments')
        .insert({
          review_id: id,
          user_id: user.id,
          content: comment
        })
    }

    setComment('')
    setSubmitting(false)

    fetchAll()
  }

  const deleteComment = async (cid) => {
    if (!confirm('Excluir comentário?')) return

    await supabase
      .from('comments')
      .delete()
      .eq('id', cid)

    fetchAll()
  }

  const deleteReview = async () => {
    if (!confirm('Excluir esta avaliação permanentemente?')) return

    await supabase
      .from('reviews')
      .delete()
      .eq('id', id)

    navigate('/')
  }

  const handleReaction = async (type) => {
    const existing = reactions.find(
      r => r.user_id === user.id && r.type === type
    )

    if (existing) {
      await supabase
        .from('reactions')
        .delete()
        .eq('id', existing.id)
    } else {
      await supabase
        .from('reactions')
        .insert({
          review_id: id,
          user_id: user.id,
          type
        })
    }

    fetchAll()
  }

  if (loading) {
    return (
      <div className={styles.center}>
        <SpinnerIcon size={28} />
      </div>
    )
  }

  if (!review) {
    return (
      <div className={styles.center}>
        Avaliação não encontrada.
      </div>
    )
  }

  const ratingColor =
    review.rating >= 8
      ? '#16a34a'
      : review.rating >= 6
        ? '#ca8a04'
        : '#dc2626'

  const isOwner = user?.id === review.user_id

  // Até 5 pessoas para aparecerem visualmente
  const visibleReactionPeople = reactions
    .filter(r => r.profiles)
    .slice(0, 5)

  const extraReactionCount = Math.max(
    reactions.length - visibleReactionPeople.length,
    0
  )

  return (
    <div className={styles.page}>

      <button
        className={styles.back}
        onClick={() => navigate(-1)}
      >
        <ChevronLeftIcon size={18} />
        Voltar
      </button>

      <article className={styles.reviewCard}>

        <div className={styles.reviewTop}>
          <div className={styles.tags}>
            <span className={styles.genre}>
              {review.genre}
            </span>

            <span className={styles.type}>
              {review.game_type}
            </span>
          </div>

          {isOwner && (
            <div className={styles.ownerActions}>
              <button
                onClick={() => setShowEditModal(true)}
                className={styles.iconBtn}
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

        <div className={styles.ratingRow}>
          {review.game_image && (
            <img
              src={review.game_image}
              alt={`Capa de ${review.game_name}`}
              className={styles.gameCover}
            />
          )}

          <div
            className={styles.ratingBig}
            style={{ color: ratingColor }}
          >
            {review.rating.toFixed(1)}
          </div>

          <div>
            <h1 className={styles.gameName}>
              {review.game_name}
            </h1>

            <Stars rating={review.rating} />
          </div>
        </div>

        <p className={styles.comment}>
          {review.comment}
        </p>

        <div className={styles.reviewFooter}>

          <Link
            to={`/profile/${review.profile_id}`}
            className={styles.author}
          >
            <div className={styles.avatar}>
              {review.avatar_url ? (
                <img
                  src={review.avatar_url}
                  alt=""
                />
              ) : (
                <span>
                  {(review.username || '?')[0].toUpperCase()}
                </span>
              )}
            </div>

            <div>
              <span className={styles.authorName}>
                {review.username}
              </span>

              <span className={styles.date}>
                {new Date(review.created_at).toLocaleDateString(
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

          <div className={styles.reactionBar}>
            {REACTION_TYPES.map(({ type, Icon, label }) => {
              const count = reactions.filter(
                r => r.type === type
              ).length

              const active = reactions.some(
                r =>
                  r.user_id === user.id &&
                  r.type === type
              )

              return (
                <button
                  key={type}
                  className={`${styles.reactionBtn} ${active ? styles.active : ''}`}
                  onClick={() => handleReaction(type)}
                  title={label}
                >
                  <Icon size={16} />

                  <span>{label}</span>

                  {count > 0 && (
                    <strong>{count}</strong>
                  )}
                </button>
              )
            })}
          </div>

        </div>

        {/* PESSOAS QUE REAGIRAM */}
        {visibleReactionPeople.length > 0 && (
          <div className={styles.reactionPeople}>

            <div className={styles.reactionAvatars}>
              {visibleReactionPeople.map(reaction => (
                <Link
                  key={reaction.id}
                  to={`/profile/${reaction.profiles.id}`}
                  className={styles.reactionPerson}
                  title={reaction.profiles.username}
                >
                  {reaction.profiles.avatar_url ? (
                    <img
                      src={reaction.profiles.avatar_url}
                      alt={reaction.profiles.username}
                    />
                  ) : (
                    <span>
                      {(reaction.profiles.username || '?')[0].toUpperCase()}
                    </span>
                  )}
                </Link>
              ))}

              {extraReactionCount > 0 && (
                <div className={styles.reactionMore}>
                  +{extraReactionCount}
                </div>
              )}
            </div>

            <span className={styles.reactionPeopleText}>
              {reactions.length === 1
                ? '1 pessoa reagiu'
                : `${reactions.length} pessoas reagiram`}
            </span>

          </div>
        )}

      </article>

      <section className={styles.commentsSection}>

        <h3 className={styles.commentsTitle}>
          <MessageIcon size={18} />

          {comments.length}{' '}
          {comments.length === 1
            ? 'comentário'
            : 'comentários'}
        </h3>

        <div className={styles.commentInput}>

          <textarea
            placeholder="Escreva um comentário..."
            value={comment}
            onChange={e => setComment(e.target.value)}
            rows={3}
            className={styles.textarea}
          />

          <div className={styles.commentActions}>

            {editing && (
              <button
                className={styles.cancelBtn}
                onClick={() => {
                  setEditing(null)
                  setComment('')
                }}
              >
                Cancelar
              </button>
            )}

            <button
              className={styles.submitBtn}
              onClick={submitComment}
              disabled={
                submitting ||
                !comment.trim()
              }
            >
              {submitting ? (
                <SpinnerIcon size={16} />
              ) : editing ? (
                'Salvar'
              ) : (
                'Comentar'
              )}
            </button>

          </div>
        </div>

        <div className={styles.commentList}>

          {comments.map(c => (
            <div
              key={c.id}
              className={styles.commentItem}
            >

              <Link
                to={`/profile/${c.profile_id}`}
                className={styles.commentAvatar}
              >
                {c.avatar_url ? (
                  <img
                    src={c.avatar_url}
                    alt=""
                  />
                ) : (
                  <span>
                    {(c.username || '?')[0].toUpperCase()}
                  </span>
                )}
              </Link>

              <div className={styles.commentBody}>

                <div className={styles.commentHead}>

                  <Link
                    to={`/profile/${c.profile_id}`}
                    className={styles.commentUser}
                  >
                    {c.username}
                  </Link>

                  <span className={styles.commentDate}>
                    {new Date(c.created_at).toLocaleDateString(
                      'pt-BR'
                    )}
                  </span>

                  {user?.id === c.user_id && (
                    <div className={styles.commentOwner}>

                      <button
                        onClick={() => {
                          setEditing(c.id)
                          setComment(c.content)
                        }}
                        className={styles.iconBtn}
                      >
                        <EditIcon size={13} />
                      </button>

                      <button
                        onClick={() => deleteComment(c.id)}
                        className={`${styles.iconBtn} ${styles.danger}`}
                      >
                        <TrashIcon size={13} />
                      </button>

                    </div>
                  )}

                </div>

                <p className={styles.commentText}>
                  {c.content}
                </p>

              </div>
            </div>
          ))}

        </div>

      </section>

      {showEditModal && (
        <ReviewModal
          existing={review}
          onClose={(saved) => {
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