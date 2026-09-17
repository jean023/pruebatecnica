from fastapi import APIRouter

router = APIRouter()


@router.get("/")
def root():
    return {"status": "ok", "project": "MoviesTech", "version": "0.1.0"}


@router.get("/health")
def health_check():
    return {"status": "healthy"}
