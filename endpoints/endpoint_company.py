from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session
from core.database import get_session
from core.core_auth import get_current_user, require_admin

from models.model_company import CompanyRead, CompanyCreate
from models.model_user import Users
from core.core_company import (
    get_all_companies,
    get_company_by_id,
    create_company,
    update_company,
    delete_company
)

router = APIRouter(prefix="/company", tags=["Company"])


@router.get("/", response_model=list[CompanyRead])
def list_companies(
    session: Session = Depends(get_session),
    current_user: Users = Depends(get_current_user)
):
    """Liste toutes les entreprises (admin uniquement)."""
    require_admin(current_user)
    return get_all_companies(session)


@router.get("/{company_id}", response_model=CompanyRead)
def read_company(
    company_id: int,
    session: Session = Depends(get_session),
    current_user: Users = Depends(get_current_user)
):
    """Recupere une entreprise par son ID (admin uniquement)."""
    require_admin(current_user)
    company = get_company_by_id(company_id, session)
    if not company:
        raise HTTPException(status_code=404, detail="Entreprise introuvable")
    return company


@router.post("/", response_model=CompanyRead)
def create_new_company(
    company_in: CompanyCreate,
    session: Session = Depends(get_session),
    current_user: Users = Depends(get_current_user)
):
    """Cree une nouvelle entreprise (admin uniquement)."""
    require_admin(current_user)
    company = create_company(company_in, session)
    return company


@router.put("/{company_id}", response_model=CompanyRead)
def update_existing_company(
    company_id: int,
    company_in: CompanyCreate,
    session: Session = Depends(get_session),
    current_user: Users = Depends(get_current_user)
):
    """Met a jour une entreprise (admin uniquement)."""
    require_admin(current_user)
    company = update_company(company_id, company_in, session)
    if not company:
        raise HTTPException(status_code=404, detail="Entreprise introuvable")
    return company


@router.delete("/{company_id}", status_code=204)
def remove_company(
    company_id: int,
    session: Session = Depends(get_session),
    current_user: Users = Depends(get_current_user)
):
    """Supprime une entreprise (admin uniquement)."""
    require_admin(current_user)
    ok = delete_company(company_id, session)
    if not ok:
        raise HTTPException(status_code=404, detail="Entreprise introuvable")
    return None
