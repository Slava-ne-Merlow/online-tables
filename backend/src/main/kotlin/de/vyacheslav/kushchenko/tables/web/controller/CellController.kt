package de.vyacheslav.kushchenko.tables.web.controller

import de.vyacheslav.kushchenko.tables.api.CellsApi
import de.vyacheslav.kushchenko.tables.api.model.Side
import de.vyacheslav.kushchenko.tables.api.model.UpdateCellRequest
import de.vyacheslav.kushchenko.tables.data.column.enum.ColumnType
import de.vyacheslav.kushchenko.tables.service.CellService
import de.vyacheslav.kushchenko.tables.util.getRequestUser
import de.vyacheslav.kushchenko.tables.util.ok
import de.vyacheslav.kushchenko.tables.web.security.annotation.CanWriteColumn
import org.springframework.stereotype.Component
import java.util.UUID

@Component
class CellController(
    private val cellService: CellService
) : CellsApi {
    @CanWriteColumn
    override fun updateCell(
        pageId: UUID,
        rowId: UUID,
        side: Side,
        columnKey: String,
        updateCellRequest: UpdateCellRequest
    ) = cellService.updateCell(
        pageId,
        rowId,
        side,
        columnKey,
        ColumnType.valueOf(updateCellRequest.dataType.name),
        updateCellRequest.value,
        getRequestUser().id!!
    ).ok()
}
