from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session
from core.database import get_session

from models.model_company import CompanyRead, CompanyCreate
from core.core_company import (
    get_all_companies,
    get_company_by_id,
    create_company,
    update_company,
    delete_company
)

router = APIRouter(prefix="/company", tags=["Company"])


@router.get("/", response_model=list[CompanyRead])
def list_companies(session: Session = Depends(get_session)):
    return get_all_companies(session)


@router.get("/{company_id}", response_model=CompanyRead)
def read_company(company_id: int, session: Session = Depends(get_session)):
    company = get_company_by_id(company_id, session)
    if not company:
        raise HTTPException(status_code=404, detail="Entreprise introuvable")
    return company


@router.post("/", response_model=CompanyRead)
def create_new_company(company_in: CompanyCreate, session: Session = Depends(get_session)):
    company = create_company(company_in, session)
    return company


@router.put("/{company_id}", response_model=CompanyRead)
def update_existing_company(company_id: int, company_in: CompanyCreate, session: Session = Depends(get_session)):
    company = update_company(company_id, company_in, session)
    if not company:
        raise HTTPException(status_code=404, detail="Entreprise introuvable")
    return company


@router.delete("/{company_id}", status_code=204)
def remove_company(company_id: int, session: Session = Depends(get_session)):
    ok = delete_company(company_id, session)
    if not ok:
        raise HTTPException(status_code=404, detail="Entreprise introuvable")
    return None
