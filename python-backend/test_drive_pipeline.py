import argparse

from pipeline import PipelineError, analyze_drive_resume


def main() -> int:
    parser = argparse.ArgumentParser(description="Safely test the Drive resume pipeline.")
    parser.add_argument("url", help="Public Google Drive PDF link")
    args = parser.parse_args()

    try:
        result = analyze_drive_resume(args.url)
    except PipelineError as exc:
        print(f"pipeline=failed code={exc.code} status={exc.status_code}")
        return 1

    analysis = result["analysis"]
    metadata = result["metadata"]
    print("pipeline=success")
    print(f"source={metadata['source']}")
    print(f"pages={metadata['pageCount']}")
    print(f"provider={metadata['provider']}")
    print(f"model={metadata['model']}")
    print(f"education_entries={len(analysis['education'])}")
    print(f"experience_entries={len(analysis['experience'])}")
    print(f"project_entries={len(analysis['projects'])}")
    print(f"skills_found={len(analysis['skills'])}")
    print(f"education_score={analysis['educationScore']['score']}")
    print(f"certifications={len(analysis['certifications'])}")
    print(f"achievements={len(analysis['achievements'])}")
    print(f"activities={len(analysis['activities'])}")
    print(f"strengths={len(analysis['strengths'])}")
    print(f"weaknesses={len(analysis['weaknesses'])}")
    print(f"suggestions={len(analysis['improvementSuggestions'])}")
    print(f"evidence_quality={analysis['evidenceQuality']['level']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
