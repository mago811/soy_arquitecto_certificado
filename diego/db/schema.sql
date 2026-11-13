CREATE TABLE IF NOT EXISTS answers (
  id           bigserial PRIMARY KEY,
  question_id  text NOT NULL,
  objective    int  NOT NULL,
  chosen       int  NOT NULL,
  correct      boolean NOT NULL,
  mode         text NOT NULL CHECK (mode IN ('practice','review','sim')),
  sim_attempt_id bigint,
  answered_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS answers_obj_idx ON answers (objective);
CREATE INDEX IF NOT EXISTS answers_time_idx ON answers (answered_at);

CREATE TABLE IF NOT EXISTS srs (
  question_id text PRIMARY KEY,
  step        int  NOT NULL,
  due_on      date NOT NULL
);

CREATE TABLE IF NOT EXISTS sim_attempts (
  id          bigserial PRIMARY KEY,
  sim_id      int NOT NULL,
  started_at  timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  answers     jsonb NOT NULL DEFAULT '{}'::jsonb,
  score_pct   numeric,
  scaled      int
);

CREATE TABLE IF NOT EXISTS plan_checks (
  task_id text PRIMARY KEY,
  done_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rule_reviews (
  objective   int PRIMARY KEY,
  reviewed_at timestamptz NOT NULL DEFAULT now()
);
