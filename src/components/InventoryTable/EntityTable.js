import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { selectEntity, setSort } from '../../store/actions';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import {
  Table as PfTable,
  TableBody,
  TableGridBreakpoint,
  TableHeader,
  TableVariant,
  sortable,
} from '@patternfly/react-table';
import { SkeletonTable } from '@redhat-cloud-services/frontend-components/SkeletonTable';
import NoEntitiesFound from './NoEntitiesFound';
import { createColumns, createRows } from './helpers';
import useColumns from './hooks/useColumns';
import useInsightsNavigate from '@redhat-cloud-services/frontend-components-utilities/useInsightsNavigate/useInsightsNavigate';
/**
 * The actual (PF)table component. It calculates each cell and every table property.
 * It uses rows, columns and loaded from redux to show correct data.
 * When row is selected `selectEntity` is dispatched.
 * @param {*} props all props used in this component.
 */
const EntityTable = ({
  hasItems,
  expandable,
  onExpandClick,
  hasCheckbox,
  actions,
  variant,
  sortBy,
  tableProps,
  onSort,
  expandable: isExpandable,
  onRowClick,
  noDetail,
  noSystemsTable = <NoEntitiesFound />,
  showTags,
  columns: columnsProp,
  disableDefaultColumns,
  loaded,
  columnsCounter,
}) => {
  const dispatch = useDispatch();
  const location = useLocation();
  const columns = useColumns(
    columnsProp,
    disableDefaultColumns,
    showTags,
    columnsCounter
  );
  const rows = useSelector(({ entities: { rows } }) => rows);
  const navigate = useInsightsNavigate();
  const onItemSelect = (_event, checked, rowId) => {
    const row = isExpandable ? rows[rowId / 2] : rows[rowId];
    dispatch(selectEntity(rowId === -1 ? 0 : row.id, checked));
  };

  const onSortChange = (_event, key, direction, index) => {
    if (key !== 'action' && key !== 'health') {
      dispatch(setSort({ index, key, direction }));
    }

    onSort?.({ index, key, direction });
  };

  const cells = useMemo(
    () => loaded && createColumns(columns, hasItems, rows, isExpandable),
    [loaded, columns, hasItems, rows, isExpandable]
  );

  const defaultRowClick = (_event, key) => {
    navigate(
      `${location.pathname}${
        location.pathname.slice(-1) === '/' ? '' : '/'
      }${key}`
    );
  };

  const tableSortBy = {
    //Inventory API has different sortBy key than system_profile
    index:
      columns?.findIndex(
        (item) =>
          sortBy?.key === item.key ||
          (sortBy?.key === 'operating_system' && item.key === 'system_profile')
      ) +
      Boolean(hasCheckbox) +
      Boolean(expandable),
    direction: sortBy?.direction,
  };

  delete tableProps.RowWrapper;
  if (rows?.length === 0) {
    delete tableProps.actionResolver;
  }

  return (
    <React.Fragment>
      {loaded && cells ? (
        PfTable && (
          <PfTable
            variant={variant}
            aria-label="Host inventory"
            cells={cells}
            rows={createRows(rows, columns, {
              actions,
              expandable,
              loaded,
              onRowClick: onRowClick || defaultRowClick,
              noDetail,
              sortBy,
              noSystemsTable,
            })}
            gridBreakPoint={
              columns?.length > 5
                ? TableGridBreakpoint.gridLg
                : TableGridBreakpoint.gridMd
            }
            className="ins-c-entity-table sentry-mask data-hj-suppress"
            onSort={(event, index, direction) => {
              onSortChange(
                event,
                cells?.[index - Boolean(hasCheckbox) - Boolean(expandable)]
                  ?.sortKey ||
                  cells?.[index - Boolean(hasCheckbox) - Boolean(expandable)]
                    ?.key,
                direction,
                index
              );
            }}
            sortBy={tableSortBy}
            {...{
              ...(hasCheckbox && rows?.length !== 0
                ? { onSelect: onItemSelect }
                : {}),
              ...(expandable ? { onCollapse: onExpandClick } : {}),
              ...(actions && rows?.length > 0 && { actions }),
            }}
            isStickyHeader
            {...tableProps}
          >
            <TableHeader />
            <TableBody />
          </PfTable>
        )
      ) : (
        <SkeletonTable
          columns={columns.map((column) =>
            column?.props?.isStatic
              ? column
              : {
                  ...column,
                  transforms: [...(column.transforms ?? []), sortable],
                }
          )}
          rowSize={15}
          variant={variant ?? tableProps.variant}
          isSelectable={hasCheckbox}
          sortBy={tableSortBy}
        />
      )}
    </React.Fragment>
  );
};

EntityTable.propTypes = {
  variant: PropTypes.oneOf(['compact']),
  expandable: PropTypes.bool,
  onExpandClick: PropTypes.func,
  onSort: PropTypes.func,
  hasCheckbox: PropTypes.bool,
  showActions: PropTypes.bool,
  hasItems: PropTypes.bool,
  showHealth: PropTypes.bool,
  sortBy: PropTypes.shape({
    key: PropTypes.string,
    direction: PropTypes.oneOf(['asc', 'desc']),
  }),
  tableProps: PropTypes.shape({
    [PropTypes.string]: PropTypes.any,
    RowWrapper: PropTypes.elementType,
    variant: PropTypes.string,
    actionResolver: PropTypes.func,
  }),
  onRowClick: PropTypes.func,
  showTags: PropTypes.bool,
  noSystemsTable: PropTypes.node,
  disableDefaultColumns: PropTypes.oneOfType([
    PropTypes.bool,
    PropTypes.arrayOf(PropTypes.string),
  ]),
  loaded: PropTypes.bool,
  columnsCounter: PropTypes.number,
  columns: PropTypes.oneOfType([PropTypes.array, PropTypes.func]),
  isLoaded: PropTypes.bool,
  actions: PropTypes.array,
  noDetail: PropTypes.any,
};

EntityTable.defaultProps = {
  loaded: false,
  showHealth: false,
  expandable: false,
  hasCheckbox: true,
  showActions: false,
  rows: [],
  variant: TableVariant.compact,
  onExpandClick: () => undefined,
  tableProps: {},
};

export default EntityTable;
