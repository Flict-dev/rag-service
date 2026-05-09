from backend.app.infrastructure.db.database import database_path, init_database, seed_database, table_counts


def main() -> None:
    init_database()
    seed_database(reset=True)
    counts = table_counts()
    print(
        f"Seeded RAG Base database at {database_path} "
        f"({counts['users']} users, {counts['articles']} articles)"
    )


if __name__ == "__main__":
    main()
