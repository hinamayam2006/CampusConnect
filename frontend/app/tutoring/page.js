import Link from 'next/link';
import styles from './tutoring.module.css';

const actionCards = [
  {
    title: 'Browse tutors',
    description: 'Search by course, rating, and availability.',
    href: '/tutors',
    badge: 'Find help',
    hint: 'Explore profiles',
    tone: 'sky',
  },
  {
    title: 'Become a tutor',
    description: 'Create your profile and set your schedule.',
    href: '/tutors/become',
    badge: 'Share skills',
    hint: 'Set your rate',
    tone: 'sun',
  },
  {
    title: 'My bookings',
    description: 'Track requests and upcoming sessions.',
    href: '/dashboard/student',
    badge: 'Student view',
    hint: 'Manage sessions',
    tone: 'mint',
  },
  {
    title: 'Tutor dashboard',
    description: 'Accept, reject, and complete requests.',
    href: '/dashboard/tutor',
    badge: 'Tutor view',
    hint: 'Review requests',
    tone: 'ink',
  },
];

const steps = [
  {
    title: 'Match by course',
    description: 'Filter tutors by subject, rating, and availability.',
  },
  {
    title: 'Book in minutes',
    description: 'Send a request with a preferred time and notes.',
  },
  {
    title: 'Stay on track',
    description: 'Manage sessions, reviews, and history in one place.',
  },
];

export default function TutoringPage() {
  return (
    <div className={styles.page}>
      <div className={`container ${styles.container}`}>
        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <span className={styles.kicker}>Tutoring hub</span>
            <h1 className={styles.title}>
              Study smarter with peer tutors who know your campus.
            </h1>
            <p className={styles.subtitle}>
              Compare tutors, lock in a time that fits your week, and keep every
              request organized without jumping between tools.
            </p>

            <div className={styles.heroActions}>
              <Link href="/tutors" className={styles.primaryBtn}>
                Browse tutors
              </Link>
              <Link href="/tutors/become" className={styles.secondaryBtn}>
                Become a tutor
              </Link>
            </div>

            <div className={styles.metrics}>
              <div className={styles.metric}>
                <div className={styles.metricValue}>Flexible slots</div>
                <div className={styles.metricLabel}>Pick times that fit your week.</div>
              </div>
              <div className={styles.metric}>
                <div className={styles.metricValue}>Peer verified</div>
                <div className={styles.metricLabel}>Profiles built by students.</div>
              </div>
              <div className={styles.metric}>
                <div className={styles.metricValue}>One place to track</div>
                <div className={styles.metricLabel}>Requests, reviews, and history.</div>
              </div>
            </div>
          </div>

          <div className={styles.heroPanel}>
            <div className={styles.panelCard}>
              <div className={styles.panelTitle}>For learners</div>
              <div className={styles.panelList}>
                <div className={styles.panelItem}>
                  <span className={styles.panelDot} />
                  <span>Compare courses and ratings fast.</span>
                </div>
                <div className={styles.panelItem}>
                  <span className={styles.panelDot} />
                  <span>Send a request with a note.</span>
                </div>
                <div className={styles.panelItem}>
                  <span className={styles.panelDot} />
                  <span>Track upcoming sessions.</span>
                </div>
              </div>
              <Link href="/tutors" className={styles.panelLink}>
                Start browsing
              </Link>
            </div>

            <div className={`${styles.panelCard} ${styles.panelAlt}`}>
              <div className={styles.panelTitle}>For tutors</div>
              <div className={styles.panelList}>
                <div className={styles.panelItem}>
                  <span className={styles.panelDot} />
                  <span>Set a rate and weekly slots.</span>
                </div>
                <div className={styles.panelItem}>
                  <span className={styles.panelDot} />
                  <span>Accept or reschedule requests.</span>
                </div>
                <div className={styles.panelItem}>
                  <span className={styles.panelDot} />
                  <span>Build reviews over time.</span>
                </div>
              </div>
              <Link href="/tutors/become" className={styles.panelLink}>
                Build your profile
              </Link>
            </div>
          </div>
        </section>

        <section className={styles.actionSection}>
          <div className={styles.sectionHeader}>
            <h2>Pick your next move</h2>
            <p>Choose where you want to go from here.</p>
          </div>

          <div className={styles.actionGrid}>
            {actionCards.map((card, index) => (
              <Link
                key={card.title}
                href={card.href}
                className={styles.actionCard}
                data-tone={card.tone}

              >
                <div className={styles.cardBadge}>{card.badge}</div>
                <div className={styles.cardTitle}>{card.title}</div>
                <p className={styles.cardDesc}>{card.description}</p>
                <div className={styles.cardFooter}>
                  <span className={styles.cardHint}>{card.hint}</span>
                  <span className={styles.cardCta}>Open</span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className={styles.stepsSection}>
          <div className={styles.sectionHeader}>
            <h2>How it works</h2>
            <p>Three steps from browse to booking.</p>
          </div>
          <div className={styles.stepsGrid}>
            {steps.map((step, index) => (
              <div
                key={step.title}
                className={styles.stepCard}

              >
                <div className={styles.stepIndex}>
                  {String(index + 1).padStart(2, '0')}
                </div>
                <h3 className={styles.stepTitle}>{step.title}</h3>
                <p className={styles.stepDesc}>{step.description}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
