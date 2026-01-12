from sqlmodel import Session, select
from models.model_company import Company, CompanyCreate

def get_all_companies(session: Session):
    statement = select(Company)
    results = session.exec(statement).all()
    return results


def get_company_by_id(company_id: int, session: Session):
    company = session.get(Company, company_id)
    return company


def create_company(company_in: CompanyCreate, session: Session):
    company = Company(**company_in.dict())
    session.add(company)
    session.commit()
    session.refresh(company)
    return company


def update_company(company_id: int, company_in: CompanyCreate, session: Session):
    company = session.get(Company, company_id)

    if not company:
        return None

    for key, value in company_in.dict().items():
        setattr(company, key, value)

    session.add(company)
    session.commit()
    session.refresh(company)

    return company


def delete_company(company_id: int, session: Session):
    """Supprime une entreprise."""
    company = session.get(Company, company_id)

    if not company:
        return False

    session.delete(company)
    session.commit()

    return True
