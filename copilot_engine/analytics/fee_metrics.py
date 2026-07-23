from __future__ import annotations


class FeeMetrics:
    """
    Fee Analytics.

    Used by:

    • Fee Dashboard
    • Analytics Agent
    • Reports
    """

    @staticmethod
    def revenue_summary(
        summary: dict,
    ) -> dict:

        if not summary:

            return {}

        total = summary.get(
            "total_collected",
            0,
        )

        outstanding = summary.get(
            "total_outstanding",
            0,
        )

        invoices = summary.get(
            "total_invoices",
            0,
        )

        overdue = summary.get(
            "overdue_count",
            0,
        )

        pending = summary.get(
            "pending_count",
            0,
        )

        collection_rate = 0

        if total + outstanding > 0:

            collection_rate = round(
                (
                    total
                    /
                    (total + outstanding)
                ) * 100,
                2,
            )

        return {

            "total_collected": total,

            "total_outstanding": outstanding,

            "total_invoices": invoices,

            "overdue_count": overdue,

            "pending_count": pending,

            "collection_rate": collection_rate,

        }

    @staticmethod
    def monthly_collection(
        monthly_data: list,
    ) -> dict:

        if not monthly_data:

            return {}

        total = sum(
            row["fees"]
            for row in monthly_data
        )

        best = max(
            monthly_data,
            key=lambda x: x["fees"],
            default=None,
        )

        average = round(
            total / len(monthly_data),
            2,
        )

        return {

            "monthly_collection": monthly_data,

            "total_collection": total,

            "average_collection": average,

            "best_month": best,

        }

    @staticmethod
    def outstanding_analysis(
        invoices: list,
    ) -> dict:

        overdue = 0

        pending = 0

        paid = 0

        partial = 0

        for invoice in invoices:

            status = getattr(
                invoice,
                "status",
                "",
            )

            if status == "paid":

                paid += 1

            elif status == "pending":

                pending += 1

            elif status == "partial":

                partial += 1

            elif status == "overdue":

                overdue += 1

        return {

            "paid": paid,

            "pending": pending,

            "partial": partial,

            "overdue": overdue,

        }