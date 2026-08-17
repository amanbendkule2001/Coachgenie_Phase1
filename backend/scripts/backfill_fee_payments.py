# import asyncio
# import uuid
# from sqlalchemy import select
# from app.database import AsyncSessionLocal
# from app.models.fee import FeeInvoice, FeePayment

# async def backfill():
#     async with AsyncSessionLocal() as db:
#         result = await db.execute(
#             select(FeeInvoice).where(FeeInvoice.amount_paid > 0)
#         )
#         invoices = result.scalars().all()
#         created, skipped = 0, 0

#         for inv in invoices:
#             existing = await db.execute(
#                 select(FeePayment).where(FeePayment.invoice_id == inv.id)
#             )
#             if existing.scalar_one_or_none():
#                 skipped += 1
#                 continue

#             db.add(FeePayment(
#                 id              = uuid.uuid4(),
#                 tenant_id       = inv.tenant_id,
#                 invoice_id      = inv.id,
#                 student_id      = inv.student_id,
#                 amount          = inv.amount_paid,
#                 payment_mode    = "cash",
#                 transaction_ref = None,
#                 notes           = "Backfilled from admission record",
#                 received_by     = None,
#             ))
#             created += 1
#             print(f"  + {inv.invoice_no} — ₹{inv.amount_paid}")

#         await db.commit()
#         print(f"\nDone — created: {created}, skipped: {skipped}")

# if __name__ == "__main__":
#     asyncio.run(backfill())



import asyncio
import uuid
from sqlalchemy import select, func
from app.database import AsyncSessionLocal
from app.models.fee import FeeInvoice, FeePayment


async def backfill():
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(FeeInvoice).where(FeeInvoice.amount_paid > 0)
        )
        invoices = result.scalars().all()

        created = 0
        skipped = 0

        for inv in invoices:
            result = await db.execute(
                select(func.coalesce(func.sum(FeePayment.amount), 0))
                .where(FeePayment.invoice_id == inv.id)
            )

            paid_total = float(result.scalar() or 0)
            invoice_total = float(inv.amount_paid)

            if paid_total >= invoice_total:
                skipped += 1
                continue

            missing = invoice_total - paid_total

            db.add(
                FeePayment(
                    id=uuid.uuid4(),
                    tenant_id=inv.tenant_id,
                    invoice_id=inv.id,
                    student_id=inv.student_id,
                    amount=missing,
                    payment_mode="cash",
                    transaction_ref=None,
                    notes="Backfilled missing payment history",
                    received_by=None,
                )
            )

            created += 1
            print(
                f"+ {inv.invoice_no}: Added missing payment "
                f"₹{missing:.2f} "
                f"(existing ₹{paid_total:.2f}, invoice ₹{invoice_total:.2f})"
            )

        await db.commit()

        print("\n===================================")
        print(f"Created : {created}")
        print(f"Skipped : {skipped}")
        print("Backfill completed successfully.")
        print("===================================")


if __name__ == "__main__":
    asyncio.run(backfill())