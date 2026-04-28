import os
import re
from datetime import timedelta

import numpy as np
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import streamlit as st
VALID_PASSWORDS = ["superforce123", "admin123"]


def check_login():
    if "logged_in" not in st.session_state:
        st.session_state.logged_in = False

    if st.session_state.logged_in:
        return True

    st.title("Login")

    password = st.text_input("Senha", type="password")

    if st.button("Entrar"):
        if password == "superforce123":  # muda isso depois
            st.session_state.logged_in = True
            st.rerun()
        else:
            st.error("Senha incorreta")

    st.stop()


st.set_page_config(
    page_title="Dashboard Rede CrossFit",
    layout="wide",
    initial_sidebar_state="expanded",
)

check_login()
st.title("Dashboard Rede CrossFit")
st.caption("MVP em Streamlit para aquisição, performance, engajamento e retenção.")


# ============================================================
# HELPERS
# ============================================================

@st.cache_data
def read_csv_file(uploaded_file):
    if uploaded_file is None:
        return None

    for sep in [",", ";", "\t"]:
        for encoding in ["utf-8", "latin1", "cp1252"]:
            try:
                uploaded_file.seek(0)
                df = pd.read_csv(uploaded_file, sep=sep, encoding=encoding)
                if df.shape[1] > 1:
                    df.columns = [str(c).strip() for c in df.columns]
                    return df
            except Exception:
                pass

    uploaded_file.seek(0)
    df = pd.read_csv(uploaded_file)
    df.columns = [str(c).strip() for c in df.columns]
    return df


def parse_date_column(series):
    return pd.to_datetime(series, dayfirst=True, errors="coerce")


def extract_hour(series):
    def parse_hour(value):
        if pd.isna(value):
            return np.nan
        match = re.search(r"(\d{1,2})", str(value))
        if not match:
            return np.nan
        hour = int(match.group(1))
        return hour if 0 <= hour <= 23 else np.nan

    return series.apply(parse_hour)


def week_start(date_series):
    return date_series - pd.to_timedelta(date_series.dt.weekday, unit="D")


def month_start(date_series):
    return date_series.dt.to_period("M").dt.to_timestamp()


def clean_client_name(name):
    name = str(name).strip()
    name = re.sub(r"\s+GYMPASS$", "", name, flags=re.IGNORECASE)
    name = re.sub(r"\s+TOTAL\s*PASS$", "", name, flags=re.IGNORECASE)
    name = re.sub(r"\s+", " ", name)
    return name.strip().upper()


def classify_origin_from_name_and_origin(row):
    name = str(row.get("Cliente", "")).strip().upper()
    origem = str(row.get("Origem", "")).strip().upper()

    if name.endswith("GYMPASS") or "GYMPASS" in origem:
        return "Gympass"

    if (
        name.endswith("TOTAL PASS")
        or "TOTALPASS" in origem.replace(" ", "")
        or "TOTAL PASS" in origem
    ):
        return "Total Pass"

    return "Contrato Box"


def parse_occupancy(value):
    value = str(value).strip()
    match = re.search(r"(\d+)\s*/\s*(\d+)", value)
    if match:
        return int(match.group(1)), int(match.group(2))

    number_match = re.search(r"\d+", value)
    if number_match:
        return int(number_match.group(0)), np.nan

    return np.nan, np.nan


def format_pct(value):
    if pd.isna(value) or value is None:
        return "-"
    return f"{value:.1%}"


def format_num(value, decimals=1):
    if pd.isna(value) or value is None:
        return "-"
    return f"{value:.{decimals}f}"


def pct_delta(current, previous):
    if pd.isna(current) or pd.isna(previous) or previous == 0:
        return np.nan
    return current / previous - 1


def pp_delta(current, previous):
    if pd.isna(current) or pd.isna(previous):
        return np.nan
    return current - previous


def format_delta_pct(value):
    if pd.isna(value):
        return None
    return f"{value:+.1%}"


def format_delta_pp(value):
    if pd.isna(value):
        return None
    return f"{value:+.1f} p.p."


def big_card(label, value, subtitle=None):
    st.markdown(
        f"""
        <div style="
            border:1px solid #d7d7d7;
            border-radius:16px;
            padding:22px;
            background:#ffffff;
            min-height:130px;
            box-shadow:0 1px 4px rgba(0,0,0,0.08);
        ">
            <div style="font-size:15px;color:#4a4a4a;margin-bottom:8px;">{label}</div>
            <div style="font-size:34px;font-weight:800;line-height:1.1;color:#111111;">{value}</div>
            <div style="font-size:14px;color:#555555;margin-top:8px;">{subtitle or ""}</div>
        </div>
        """,
        unsafe_allow_html=True,
    )


def make_gauge(title, value, subtitle=""):
    value_pct = 0 if pd.isna(value) else value * 100

    fig = go.Figure(
        go.Indicator(
            mode="gauge+number",
            value=value_pct,
            number={"suffix": "%", "valueformat": ".1f"},
            title={"text": f"{title}<br><span style='font-size:0.75em'>{subtitle}</span>"},
            gauge={
                "axis": {"range": [0, 100]},
                "bar": {"thickness": 0.28},
                "shape": "angular",
            },
        )
    )

    fig.update_layout(height=260, margin=dict(l=20, r=20, t=60, b=10))
    return fig


def retention_monthly_28d(df, retention_window_days, origin="Geral"):
    rows = []
    periods = sorted(df["Mês"].dropna().unique())

    for period in periods:
        period_df = df[df["Mês"] == period]
        if period_df.empty:
            continue

        period_start = pd.to_datetime(period_df["Data Base"].min())
        lookback_start = period_start - timedelta(days=retention_window_days)
        lookback_end = period_start - timedelta(days=1)

        previous_window = df[
            (df["Data Base"] >= lookback_start)
            & (df["Data Base"] <= lookback_end)
        ]

        if origin == "Geral":
            current_students = set(period_df["Cliente Limpo"])
            previous_students = set(previous_window["Cliente Limpo"])
        else:
            current_students = set(
                period_df.loc[period_df["Origem Grupo"] == origin, "Cliente Limpo"]
            )
            previous_students = set(
                previous_window.loc[
                    previous_window["Origem Grupo"] == origin, "Cliente Limpo"
                ]
            )

        retained = current_students.intersection(previous_students)
        rate = len(retained) / len(current_students) if current_students else np.nan

        rows.append(
            {
                "periodo": period,
                "origem": origin,
                "alunos_periodo": len(current_students),
                "alunos_retidos": len(retained),
                "retencao": rate,
            }
        )

    return pd.DataFrame(rows)


def retention_weekly_previous_week(df):
    weekly_pairs = (
        df.groupby(["Semana", "Cliente Limpo"])
        .size()
        .reset_index(name="checkins")
    )

    weeks_sorted = sorted(weekly_pairs["Semana"].dropna().unique())
    rows = []

    for i in range(1, len(weeks_sorted)):
        current_w = weeks_sorted[i]
        prev_w = weeks_sorted[i - 1]

        current_students = set(
            weekly_pairs.loc[weekly_pairs["Semana"] == current_w, "Cliente Limpo"]
        )
        prev_students = set(
            weekly_pairs.loc[weekly_pairs["Semana"] == prev_w, "Cliente Limpo"]
        )

        retained = len(current_students.intersection(prev_students))
        rate = retained / len(prev_students) if prev_students else np.nan

        rows.append(
            {
                "periodo": current_w,
                "retencao": rate,
                "alunos_retidos": retained,
                "alunos_base": len(prev_students),
            }
        )

    return pd.DataFrame(rows)


# ============================================================
# SIDEBAR
# ============================================================

st.sidebar.header("1. Upload dos CSVs")

acquisition_file = st.sidebar.file_uploader(
    "CSV Aquisição / Cadastro: #, Nome, Tipo, Data Cadastro, Como Conheceu",
    type=["csv"],
    key="uploader_aquisicao_csv",
)

classes_file = st.sidebar.file_uploader(
    "CSV Aulas / Ocupação: Programa, Data, Horário, Ocupação, % de Ocupação",
    type=["csv"],
    key="uploader_aulas_ocupacao_csv",
)

checkins_file = st.sidebar.file_uploader(
    "CSV Check-ins: Cliente, Programa, Data Treino, Data Check-in, Origem",
    type=["csv"],
    key="uploader_checkins_csv",
)

st.sidebar.header("2. Parâmetros")

retention_window_days = st.sidebar.number_input(
    "Janela de aluno ativo / retenção em dias",
    min_value=7,
    max_value=90,
    value=28,
    step=1,
    key="input_retention_window_days",
)

gympass_target = st.sidebar.number_input(
    "Target mensal Gympass / Total Pass",
    min_value=1,
    max_value=31,
    value=13,
    step=1,
    key="input_gympass_totalpass_target",
)

ignore_classes_with_checkins_lte = st.sidebar.number_input(
    "Ignorar aulas com ocupação menor ou igual a",
    min_value=0,
    max_value=10,
    value=1,
    step=1,
    key="input_ignore_classes_checkins_lte",
)


# ============================================================
# LOAD
# ============================================================

def load_dataset(uploaded_file, default_relative_path, dataset_label):
    if uploaded_file is not None:
        return read_csv_file(uploaded_file), "upload"

    default_path = os.path.join("data", default_relative_path)
    if not os.path.exists(default_path):
        st.error(
            f"Arquivo padrao ausente para {dataset_label}: {default_path}. "
            "Envie o CSV manualmente ou adicione o arquivo no repositorio."
        )
        st.stop()

    try:
        df = pd.read_csv(default_path, sep=";")
    except Exception as exc:
        st.error(
            f"Falha ao carregar arquivo padrao de {dataset_label} ({default_path}): {exc}"
        )
        st.stop()

    return df, default_path


acq_raw, acq_source = load_dataset(acquisition_file, "aquisicao.csv", "aquisição")
classes_raw, classes_source = load_dataset(classes_file, "aulas.csv", "aulas")
checkins_raw, checkins_source = load_dataset(checkins_file, "checkins.csv", "check-ins")

st.sidebar.caption(
    f"Debug - arquivo de aquisição usado: {acq_source if acq_source == 'upload' else 'data/aquisicao.csv'}"
)
st.sidebar.caption(
    f"Debug - arquivo de aulas usado: {classes_source if classes_source == 'upload' else 'data/aulas.csv'}"
)
st.sidebar.caption(
    f"Debug - arquivo de checkins usado: {checkins_source if checkins_source == 'upload' else 'data/checkins.csv'}"
)


# ============================================================
# PREP AQUISIÇÃO
# ============================================================

acq = acq_raw.copy()

required_acq_cols = ["Nome", "Tipo", "Data Cadastro", "Como Conheceu"]
missing_acq = [c for c in required_acq_cols if c not in acq.columns]

if missing_acq:
    st.error(f"CSV de aquisição está sem colunas obrigatórias: {missing_acq}")
    st.stop()

acq["Data Cadastro"] = parse_date_column(acq["Data Cadastro"])
acq["Tipo"] = acq["Tipo"].astype(str).str.strip()
acq["Como Conheceu"] = (
    acq["Como Conheceu"]
    .astype(str)
    .str.strip()
    .replace({"nan": "Não informado", "": "Não informado"})
)
acq["is_cliente"] = acq["Tipo"].str.lower().eq("cliente")


# ============================================================
# PREP AULAS
# ============================================================

classes = classes_raw.copy()

required_classes_cols = ["Programa", "Data", "Horário", "Ocupação", "% de Ocupação"]
missing_classes = [c for c in required_classes_cols if c not in classes.columns]

if missing_classes:
    st.error(f"CSV de aulas está sem colunas obrigatórias: {missing_classes}")
    st.stop()

classes["Data"] = parse_date_column(classes["Data"])
classes["Hora"] = extract_hour(classes["Horário"])

classes[["Checkins Aula", "Capacidade Aula"]] = classes["Ocupação"].apply(
    lambda x: pd.Series(parse_occupancy(x))
)

classes["% Ocupação Num"] = pd.to_numeric(
    classes["% de Ocupação"]
    .astype(str)
    .str.replace("%", "", regex=False)
    .str.replace(",", ".", regex=False),
    errors="coerce",
)

classes["% Ocupação Num"] = np.where(
    classes["% Ocupação Num"] > 1,
    classes["% Ocupação Num"] / 100,
    classes["% Ocupação Num"],
)

classes["% Ocupação Num"] = classes["% Ocupação Num"].fillna(
    classes["Checkins Aula"] / classes["Capacidade Aula"]
)

classes = classes.dropna(subset=["Data", "Hora"])
classes = classes[classes["Checkins Aula"] > ignore_classes_with_checkins_lte]
classes = classes[classes["Data"].dt.weekday != 6]

classes["Semana"] = week_start(classes["Data"])
classes["Mês"] = month_start(classes["Data"])

weekday_order = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
]

weekday_pt = {
    "Monday": "Segunda",
    "Tuesday": "Terça",
    "Wednesday": "Quarta",
    "Thursday": "Quinta",
    "Friday": "Sexta",
    "Saturday": "Sábado",
    "Sunday": "Domingo",
}

classes["Dia Semana EN"] = classes["Data"].dt.day_name()
classes["Dia Semana"] = classes["Dia Semana EN"].map(weekday_pt)


# ============================================================
# PREP CHECKINS
# ============================================================

checkins = checkins_raw.copy()

required_checkins_cols = ["Cliente", "Programa", "Data Treino", "Data Check-in", "Origem"]
missing_checkins = [c for c in required_checkins_cols if c not in checkins.columns]

if missing_checkins:
    st.error(f"CSV de check-ins está sem colunas obrigatórias: {missing_checkins}")
    st.stop()

checkins["Data Treino"] = parse_date_column(checkins["Data Treino"])
checkins["Data Check-in"] = parse_date_column(checkins["Data Check-in"])
checkins["Data Base"] = checkins["Data Treino"].fillna(checkins["Data Check-in"])
checkins = checkins.dropna(subset=["Data Base"])

checkins["Origem Grupo"] = checkins.apply(classify_origin_from_name_and_origin, axis=1)
checkins["Cliente Limpo"] = checkins["Cliente"].apply(clean_client_name)
checkins["Semana"] = week_start(checkins["Data Base"])
checkins["Mês"] = month_start(checkins["Data Base"])


# ============================================================
# FILTRO
# ============================================================

min_date = min(
    d
    for d in [
        acq["Data Cadastro"].min(),
        classes["Data"].min(),
        checkins["Data Base"].min(),
    ]
    if pd.notna(d)
)

max_date = max(
    d
    for d in [
        acq["Data Cadastro"].max(),
        classes["Data"].max(),
        checkins["Data Base"].max(),
    ]
    if pd.notna(d)
)

st.sidebar.header("3. Filtro de período")

selected_range = st.sidebar.date_input(
    "Período analisado",
    value=(min_date.date(), max_date.date()),
    min_value=min_date.date(),
    max_value=max_date.date(),
    key="input_periodo_analisado",
)

if isinstance(selected_range, tuple) and len(selected_range) == 2:
    start_date = pd.to_datetime(selected_range[0])
    end_date = pd.to_datetime(selected_range[1])
else:
    start_date = min_date
    end_date = max_date

acq_f = acq[
    (acq["Data Cadastro"] >= start_date)
    & (acq["Data Cadastro"] <= end_date)
]

classes_f = classes[
    (classes["Data"] >= start_date)
    & (classes["Data"] <= end_date)
]

checkins_f = checkins[
    (checkins["Data Base"] >= start_date)
    & (checkins["Data Base"] <= end_date)
]


# ============================================================
# PERÍODOS DE REFERÊNCIA
# ============================================================

latest_date = checkins["Data Base"].max()

current_open_week = week_start(pd.Series([latest_date])).iloc[0]
latest_week = current_open_week - timedelta(days=7)
previous_week = latest_week - timedelta(days=7)

latest_month = latest_date.to_period("M").to_timestamp()
previous_month = (latest_month - pd.DateOffset(months=1)).to_period("M").to_timestamp()


# ============================================================
# AGREGAÇÕES
# ============================================================

weekly_student = (
    checkins.groupby(["Semana", "Origem Grupo", "Cliente Limpo"])
    .size()
    .reset_index(name="checkins")
)

weekly_total = (
    weekly_student.groupby("Semana")
    .agg(
        alunos=("Cliente Limpo", "nunique"),
        media_checkins=("checkins", "mean"),
        mediana_checkins=("checkins", "median"),
        total_checkins=("checkins", "sum"),
    )
    .reset_index()
)

weekly_by_origin = (
    weekly_student.groupby(["Semana", "Origem Grupo"])
    .agg(
        alunos=("Cliente Limpo", "nunique"),
        media_checkins=("checkins", "mean"),
        mediana_checkins=("checkins", "median"),
        total_checkins=("checkins", "sum"),
    )
    .reset_index()
)

monthly_student = (
    checkins.groupby(["Mês", "Origem Grupo", "Cliente Limpo"])
    .size()
    .reset_index(name="checkins")
)

monthly_total = (
    monthly_student.groupby("Mês")
    .agg(
        alunos=("Cliente Limpo", "nunique"),
        media_checkins=("checkins", "mean"),
        mediana_checkins=("checkins", "median"),
        total_checkins=("checkins", "sum"),
    )
    .reset_index()
)

monthly_by_origin = (
    monthly_student.groupby(["Mês", "Origem Grupo"])
    .agg(
        alunos=("Cliente Limpo", "nunique"),
        media_checkins=("checkins", "mean"),
        mediana_checkins=("checkins", "median"),
        total_checkins=("checkins", "sum"),
    )
    .reset_index()
)

weekly_ret = retention_weekly_previous_week(checkins)
monthly_ret = retention_monthly_28d(checkins, retention_window_days, "Geral")


# ============================================================
# TABS
# ============================================================

tab_intro, tab_aq, tab_perf, tab_eng, tab_ret, tab_fin, tab_data = st.tabs(
    [
        "Resumo das métricas",
        "Aquisição",
        "Performance",
        "Engajamento",
        "Retenção",
        "Financeiro",
        "Dados",
    ]
)

with tab_intro:
    st.header("Resumo das métricas")

    st.markdown("""
    ### Aquisição
    - **Cadastros/leads:** total de pessoas cadastradas no período.
    - **Convertidos para aluno:** pessoas com `Tipo = Cliente`.
    - **Conversão experimental → aluno:** clientes / cadastros.
    - **Canal de aquisição:** quebra por `Como Conheceu`.

    ### Performance
    - **Alunos ativos:** alunos com ao menos 1 check-in nos últimos 28 dias.
    - **Contrato Box, Gympass e Total Pass:** alunos ativos separados por origem.
    - **Retenção mensal:** alunos do mês atual que também treinaram nos 28 dias anteriores.
    - **Ocupação média:** média de ocupação das aulas válidas.

    ### Engajamento
    - **Check-ins por aluno:** frequência média de treino.
    - **WoW:** variação da última semana completa contra a semana anterior.
    - **MTD vs mês anterior:** mês atual acumulado contra o mês anterior.
    - **Heatmap:** ocupação média por dia da semana e horário.
    - **Melhor/pior dia:** dias com maior e menor ocupação média.

    ### Gympass / Total Pass
    - **Target mensal:** meta de 13 check-ins/mês.
    - **% no target:** percentual de alunos que já atingiram a meta.
    - **Mediana MTD:** mediana de check-ins no mês atual.
    - **Evolução mensal:** tendência da mediana de check-ins.

    ### Retenção
    - **Retenção semanal:** alunos da semana anterior que voltaram na última semana completa.
    - **Retenção mensal:** alunos do mês atual que também tiveram check-in nos 28 dias anteriores.
    """)


# ============================================================
# AQUISIÇÃO
# ============================================================

with tab_aq:
    st.header("Aquisição")

    total_cadastros = acq_f["Nome"].nunique()
    total_clientes = acq_f.loc[acq_f["is_cliente"], "Nome"].nunique()
    conv_exp_para_aluno = total_clientes / total_cadastros if total_cadastros else np.nan

    c1, c2, c3 = st.columns(3)

    c1.metric("Cadastros / leads no período", total_cadastros)
    c2.metric("Convertidos para aluno", total_clientes)
    c3.metric("Conversão experimental → aluno", format_pct(conv_exp_para_aluno))

    st.subheader("Conversão para aluno por canal")

    canal = (
        acq_f.groupby("Como Conheceu")
        .agg(
            cadastros=("Nome", "nunique"),
            alunos=("is_cliente", "sum"),
        )
        .reset_index()
    )

    canal["conversao_aluno"] = canal["alunos"] / canal["cadastros"]
    canal = canal.sort_values("alunos", ascending=False)

    col1, col2 = st.columns([1.2, 1])

    with col1:
        st.dataframe(
            canal.assign(
                conversao_aluno=canal["conversao_aluno"].map(format_pct)
            ),
            use_container_width=True,
        )

    with col2:
        fig = px.bar(
            canal,
            x="Como Conheceu",
            y="alunos",
            text="alunos",
            title="Alunos convertidos por canal",
        )
        fig.update_layout(xaxis_title="Canal", yaxis_title="Alunos")
        st.plotly_chart(fig, use_container_width=True)

    st.info(
        "Conversão de lead → experimental ficou fora por enquanto porque o CSV não possui esse estágio explicitamente."
    )


# ============================================================
# PERFORMANCE
# ============================================================

with tab_perf:
    st.header("Performance")

    active_cutoff = latest_date - timedelta(days=retention_window_days)

    active_base = checkins[checkins["Data Base"] >= active_cutoff]

    active_students = (
        active_base.groupby(["Origem Grupo", "Cliente Limpo"])
        .size()
        .reset_index(name="checkins")
    )

    active_by_origin = (
        active_students.groupby("Origem Grupo")["Cliente Limpo"]
        .nunique()
        .reset_index(name="ativos")
    )

    total_active = active_students["Cliente Limpo"].nunique()

    active_box = int(
        active_by_origin.loc[
            active_by_origin["Origem Grupo"] == "Contrato Box", "ativos"
        ].sum()
    )
    active_gp = int(
        active_by_origin.loc[
            active_by_origin["Origem Grupo"] == "Gympass", "ativos"
        ].sum()
    )
    active_tp = int(
        active_by_origin.loc[
            active_by_origin["Origem Grupo"] == "Total Pass", "ativos"
        ].sum()
    )

    c1, c2, c3, c4 = st.columns(4)

    c1.metric(f"Alunos ativos últimos {retention_window_days} dias", total_active)
    c2.metric("Contrato Box ativos", active_box)
    c3.metric("Gympass ativos", active_gp)
    c4.metric("Total Pass ativos", active_tp)

    st.subheader("Retenção mensal")

    current_month_ret = monthly_ret.loc[
        monthly_ret["periodo"] == latest_month, "retencao"
    ]
    prev_month_ret = monthly_ret.loc[
        monthly_ret["periodo"] == previous_month, "retencao"
    ]

    current_month_ret = current_month_ret.iloc[0] if len(current_month_ret) else np.nan
    prev_month_ret = prev_month_ret.iloc[0] if len(prev_month_ret) else np.nan

    m1, m2, m3 = st.columns(3)

    m1.metric(
        "Retenção mensal atual",
        format_pct(current_month_ret),
        delta=format_delta_pp(pp_delta(current_month_ret, prev_month_ret)),
    )

    m2.metric(
        "Alunos retidos no mês",
        int(
            monthly_ret.loc[
                monthly_ret["periodo"] == latest_month, "alunos_retidos"
            ].sum()
        ),
    )

    m3.metric(
        "Base ativa do mês",
        int(
            monthly_ret.loc[
                monthly_ret["periodo"] == latest_month, "alunos_periodo"
            ].sum()
        ),
    )

    st.subheader("Resumo de aulas no período")

    aulas_realizadas = len(classes_f)
    media_alunos_aula = classes_f["Checkins Aula"].mean()
    mediana_alunos_aula = classes_f["Checkins Aula"].median()
    ocupacao_media = classes_f["% Ocupação Num"].mean()

    c1, c2, c3, c4 = st.columns(4)

    c1.metric("Total de aulas no período", aulas_realizadas)
    c2.metric("Média alunos/aula", format_num(media_alunos_aula))
    c3.metric("Mediana alunos/aula", format_num(mediana_alunos_aula))
    c4.metric("Ocupação média", format_pct(ocupacao_media))


# ============================================================
# ENGAJAMENTO
# ============================================================

with tab_eng:
    st.header("Engajamento")

    st.subheader("Evolução semanal — última semana completa vs semana anterior")

    latest_week_row = weekly_total[weekly_total["Semana"] == latest_week]
    prev_week_row = weekly_total[weekly_total["Semana"] == previous_week]

    lw_media = latest_week_row["media_checkins"].iloc[0] if len(latest_week_row) else np.nan
    pw_media = prev_week_row["media_checkins"].iloc[0] if len(prev_week_row) else np.nan

    lw_mediana = latest_week_row["mediana_checkins"].iloc[0] if len(latest_week_row) else np.nan
    pw_mediana = prev_week_row["mediana_checkins"].iloc[0] if len(prev_week_row) else np.nan

    lw_alunos = latest_week_row["alunos"].iloc[0] if len(latest_week_row) else np.nan
    pw_alunos = prev_week_row["alunos"].iloc[0] if len(prev_week_row) else np.nan

    lw_checkins = latest_week_row["total_checkins"].iloc[0] if len(latest_week_row) else np.nan
    pw_checkins = prev_week_row["total_checkins"].iloc[0] if len(prev_week_row) else np.nan

    c1, c2, c3, c4 = st.columns(4)

    c1.metric(
        "Check-ins / aluno",
        format_num(lw_media),
        delta=format_delta_pct(pct_delta(lw_media, pw_media)),
    )

    c2.metric(
        "Mediana check-ins / aluno",
        format_num(lw_mediana),
        delta=format_delta_pct(pct_delta(lw_mediana, pw_mediana)),
    )

    c3.metric(
        "Alunos com check-in",
        int(lw_alunos) if pd.notna(lw_alunos) else "-",
        delta=format_delta_pct(pct_delta(lw_alunos, pw_alunos)),
    )

    c4.metric(
        "Total de check-ins",
        int(lw_checkins) if pd.notna(lw_checkins) else "-",
        delta=format_delta_pct(pct_delta(lw_checkins, pw_checkins)),
    )

    fig = px.line(
        weekly_total,
        x="Semana",
        y="media_checkins",
        markers=True,
        title="Média de check-ins por aluno — evolução semanal",
    )
    fig.update_layout(xaxis_title="Semana", yaxis_title="Check-ins por aluno")
    st.plotly_chart(fig, use_container_width=True)

    st.divider()

    st.subheader("Resumo mensal — MTD vs mês anterior")

    current_month_data = monthly_total[monthly_total["Mês"] == latest_month]
    previous_month_data = monthly_total[monthly_total["Mês"] == previous_month]

    cm_media = current_month_data["media_checkins"].iloc[0] if len(current_month_data) else np.nan
    pm_media = previous_month_data["media_checkins"].iloc[0] if len(previous_month_data) else np.nan

    cm_mediana = current_month_data["mediana_checkins"].iloc[0] if len(current_month_data) else np.nan
    pm_mediana = previous_month_data["mediana_checkins"].iloc[0] if len(previous_month_data) else np.nan

    cm_alunos = current_month_data["alunos"].iloc[0] if len(current_month_data) else np.nan
    pm_alunos = previous_month_data["alunos"].iloc[0] if len(previous_month_data) else np.nan

    cm_checkins = current_month_data["total_checkins"].iloc[0] if len(current_month_data) else np.nan
    pm_checkins = previous_month_data["total_checkins"].iloc[0] if len(previous_month_data) else np.nan

    c1, c2, c3, c4 = st.columns(4)

    c1.metric(
        "MTD check-ins / aluno",
        format_num(cm_media),
        delta=format_delta_pct(pct_delta(cm_media, pm_media)),
    )

    c2.metric(
        "MTD mediana / aluno",
        format_num(cm_mediana),
        delta=format_delta_pct(pct_delta(cm_mediana, pm_mediana)),
    )

    c3.metric(
        "Alunos MTD",
        int(cm_alunos) if pd.notna(cm_alunos) else "-",
        delta=format_delta_pct(pct_delta(cm_alunos, pm_alunos)),
    )

    c4.metric(
        "Check-ins MTD",
        int(cm_checkins) if pd.notna(cm_checkins) else "-",
        delta=format_delta_pct(pct_delta(cm_checkins, pm_checkins)),
    )

    fig = px.line(
        monthly_total,
        x="Mês",
        y="media_checkins",
        markers=True,
        title="Média de check-ins por aluno — evolução mensal",
    )
    fig.update_layout(xaxis_title="Mês", yaxis_title="Check-ins por aluno")
    st.plotly_chart(fig, use_container_width=True)

    st.divider()

    st.subheader("Ocupação média por dia da semana e horário")

    heatmap_base = (
        classes_f.groupby(["Dia Semana", "Dia Semana EN", "Hora"])
        .agg(ocupacao_media=("% Ocupação Num", "mean"))
        .reset_index()
    )

    heatmap_base["Dia Semana EN"] = pd.Categorical(
        heatmap_base["Dia Semana EN"],
        categories=weekday_order,
        ordered=True,
    )

    heatmap_base = heatmap_base.sort_values(["Dia Semana EN", "Hora"])

    pivot = heatmap_base.pivot(
        index="Dia Semana",
        columns="Hora",
        values="ocupacao_media",
    )

    ordered_pt = [weekday_pt[d] for d in weekday_order if weekday_pt[d] in pivot.index]
    pivot = pivot.reindex(ordered_pt)

    fig = px.imshow(
        pivot,
        aspect="auto",
        text_auto=".0%",
        title="Heatmap de ocupação média por dia e horário",
    )
    fig.update_layout(xaxis_title="Hora", yaxis_title="Dia da semana")
    st.plotly_chart(fig, use_container_width=True)

    day_summary = (
        classes_f.groupby("Dia Semana")
        .agg(
            ocupacao_media=("% Ocupação Num", "mean"),
            checkins_medios=("Checkins Aula", "mean"),
            aulas=("Checkins Aula", "count"),
        )
        .reset_index()
    )

    best_day = day_summary.sort_values("ocupacao_media", ascending=False).head(1)
    worst_day = day_summary.sort_values("ocupacao_media", ascending=True).head(1)

    b1, b2 = st.columns(2)

    with b1:
        if not best_day.empty:
            row = best_day.iloc[0]
            big_card(
                "Melhor dia da semana",
                str(row["Dia Semana"]),
                f"Ocupação média {format_pct(row['ocupacao_media'])} | {format_num(row['checkins_medios'])} alunos/aula",
            )

    with b2:
        if not worst_day.empty:
            row = worst_day.iloc[0]
            big_card(
                "Pior dia da semana",
                str(row["Dia Semana"]),
                f"Ocupação média {format_pct(row['ocupacao_media'])} | {format_num(row['checkins_medios'])} alunos/aula",
            )

    st.divider()

    st.subheader("Gympass e Total Pass — frequência e target")

    for origin in ["Gympass", "Total Pass"]:
        st.markdown(f"### {origin}")

        w_origin = weekly_by_origin[weekly_by_origin["Origem Grupo"] == origin]
        m_origin = monthly_by_origin[monthly_by_origin["Origem Grupo"] == origin]

        lw = w_origin[w_origin["Semana"] == latest_week]
        pw = w_origin[w_origin["Semana"] == previous_week]

        cm = m_origin[m_origin["Mês"] == latest_month]
        pm = m_origin[m_origin["Mês"] == previous_month]

        lw_media_o = lw["media_checkins"].iloc[0] if len(lw) else np.nan
        pw_media_o = pw["media_checkins"].iloc[0] if len(pw) else np.nan

        cm_media_o = cm["media_checkins"].iloc[0] if len(cm) else np.nan
        pm_media_o = pm["media_checkins"].iloc[0] if len(pm) else np.nan

        latest_month_students = monthly_student[
            (monthly_student["Origem Grupo"] == origin)
            & (monthly_student["Mês"] == latest_month)
        ].copy()

        previous_month_students = monthly_student[
            (monthly_student["Origem Grupo"] == origin)
            & (monthly_student["Mês"] == previous_month)
        ].copy()

        if latest_month_students.empty:
            target_rate = np.nan
            target_median = np.nan
        else:
            target_rate = (latest_month_students["checkins"] >= gympass_target).mean()
            target_median = latest_month_students["checkins"].median()

        previous_target_median = (
            previous_month_students["checkins"].median()
            if not previous_month_students.empty
            else np.nan
        )

        c1, c2, c3, c4 = st.columns(4)

        c1.metric(
            "Última semana check-ins/aluno",
            format_num(lw_media_o),
            delta=format_delta_pct(pct_delta(lw_media_o, pw_media_o)),
        )

        c2.metric(
            "MTD check-ins/aluno",
            format_num(cm_media_o),
            delta=format_delta_pct(pct_delta(cm_media_o, pm_media_o)),
        )

        c3.metric(
            "Alunos MTD",
            int(cm["alunos"].iloc[0]) if len(cm) else "-",
        )

        c4.metric(
            "Mediana MTD",
            format_num(target_median, 0),
            delta=None
            if pd.isna(previous_target_median)
            else f"{target_median - previous_target_median:+.0f} vs mês anterior",
            help=f"Target: {gympass_target} check-ins/mês | Mediana mês anterior: {format_num(previous_target_median, 0)}",
        )

        st.plotly_chart(
            make_gauge(
                f"% no target — {origin}",
                target_rate,
                f"Mediana MTD: {format_num(target_median, 0)} | mês anterior: {format_num(previous_target_median, 0)}",
            ),
            use_container_width=True,
        )

        median_evolution = m_origin.sort_values("Mês")

        if not median_evolution.empty:
            fig = px.line(
                median_evolution,
                x="Mês",
                y="mediana_checkins",
                markers=True,
                title=f"Evolução mensal da mediana de check-ins — {origin}",
            )
            fig.update_layout(
                xaxis_title="Mês",
                yaxis_title="Mediana de check-ins/aluno",
            )
            st.plotly_chart(fig, use_container_width=True)


# ============================================================
# RETENÇÃO
# ============================================================

with tab_ret:
    latest_week_ret = weekly_ret.loc[
        weekly_ret["periodo"] == latest_week, "retencao"
    ]
    previous_week_ret = weekly_ret.loc[
        weekly_ret["periodo"] == previous_week, "retencao"
    ]

    latest_month_ret = monthly_ret.loc[
        monthly_ret["periodo"] == latest_month, "retencao"
    ]
    previous_month_ret = monthly_ret.loc[
        monthly_ret["periodo"] == previous_month, "retencao"
    ]

    latest_week_ret = latest_week_ret.iloc[0] if len(latest_week_ret) else np.nan
    previous_week_ret = previous_week_ret.iloc[0] if len(previous_week_ret) else np.nan

    latest_month_ret = latest_month_ret.iloc[0] if len(latest_month_ret) else np.nan
    previous_month_ret = previous_month_ret.iloc[0] if len(previous_month_ret) else np.nan

    st.header(
        f"Retenção — {format_pct(latest_month_ret)} mensal | "
        f"{format_delta_pp(pp_delta(latest_month_ret, previous_month_ret)) or '-'} MoM"
    )

    st.caption(
        "Semanal = alunos da semana anterior que voltaram na última semana completa. "
        f"Mensal = alunos do mês atual que também tiveram check-in nos {retention_window_days} dias anteriores."
    )

    c1, c2, c3, c4 = st.columns(4)

    c1.metric(
        "Retenção semanal",
        format_pct(latest_week_ret),
        delta=format_delta_pp(pp_delta(latest_week_ret, previous_week_ret)),
    )

    c2.metric(
        "Retenção mensal",
        format_pct(latest_month_ret),
        delta=format_delta_pp(pp_delta(latest_month_ret, previous_month_ret)),
    )

    c3.metric(
        "Alunos retidos semana",
        int(
            weekly_ret.loc[
                weekly_ret["periodo"] == latest_week, "alunos_retidos"
            ].sum()
        ),
    )

    c4.metric(
        "Base semana anterior",
        int(
            weekly_ret.loc[
                weekly_ret["periodo"] == latest_week, "alunos_base"
            ].sum()
        ),
    )

    fig = px.line(
        weekly_ret,
        x="periodo",
        y="retencao",
        markers=True,
        title="Retenção semanal",
    )
    fig.update_layout(
        yaxis_tickformat=".0%",
        xaxis_title="Semana",
        yaxis_title="Retenção",
    )
    st.plotly_chart(fig, use_container_width=True)

    fig = px.line(
        monthly_ret,
        x="periodo",
        y="retencao",
        markers=True,
        title="Retenção mensal",
    )
    fig.update_layout(
        yaxis_tickformat=".0%",
        xaxis_title="Mês",
        yaxis_title="Retenção",
    )
    st.plotly_chart(fig, use_container_width=True)

    st.subheader("Retenção por origem — mês atual")

    cols = st.columns(3)

    for col, origin in zip(cols, ["Contrato Box", "Gympass", "Total Pass"]):
        m_origin = retention_monthly_28d(checkins, retention_window_days, origin)

        cur = m_origin.loc[m_origin["periodo"] == latest_month, "retencao"]
        prev = m_origin.loc[m_origin["periodo"] == previous_month, "retencao"]

        cur = cur.iloc[0] if len(cur) else np.nan
        prev = prev.iloc[0] if len(prev) else np.nan

        with col:
            st.metric(
                origin,
                format_pct(cur),
                delta=format_delta_pp(pp_delta(cur, prev)),
            )


# ============================================================
# FINANCEIRO
# ============================================================

with tab_fin:
    st.header("Financeiro")
    st.info(
        "Espaço reservado para indicadores financeiros: receita, custos, repasses Gympass/Total Pass, margem e inadimplência."
    )


# ============================================================
# DADOS
# ============================================================

with tab_data:
    st.header("Dados e validações")

    st.subheader("Aquisição")
    st.write(acq_f.shape)
    st.dataframe(acq_f.head(100), use_container_width=True)

    st.subheader("Aulas / ocupação filtradas")
    st.write(classes_f.shape)
    st.dataframe(classes_f.head(100), use_container_width=True)

    st.subheader("Check-ins filtrados")
    st.write(checkins_f.shape)
    st.dataframe(checkins_f.head(100), use_container_width=True)

    st.subheader("Checagens rápidas")
    st.write(
        {
            "linhas_aquisicao": len(acq),
            "linhas_aulas_originais": len(classes_raw),
            "linhas_aulas_validas_pos_filtro": len(classes),
            "linhas_checkins": len(checkins),
            "primeira_data": str(min_date.date()),
            "ultima_data": str(max_date.date()),
            "ultima_semana_completa": str(latest_week.date()),
            "semana_atual_em_aberto": str(current_open_week.date()),
            "mes_atual": str(latest_month.date()),
        }
    )