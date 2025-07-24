import {
  Box,
  Button,
  Flex,
  Heading,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  Text,
  VStack,
  Tag,
  Container,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Input,
  Select,
  FormControl,
  FormLabel,
  Divider,
  IconButton,
} from '@chakra-ui/react';
import { Funnel, ArrowClockwise } from '@phosphor-icons/react';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useReducer } from 'react';
import { useTranslation } from 'react-i18next';
import { LoadingScreen } from '../../shared/base/loading-screen';
import { SharedSpinner } from '../../shared/base/shared-spinner';
import { Paginator } from '../../shared/base/inputs/paginator';
import { PerPageSelect } from '../../shared/base/inputs/per-page-select';
import { getCsrfToken } from '../../../utils/utility-functions';

interface AuditLogEntry {
  id: string;
  table_name: string;
  action: string;
  data_before: any;
  data_after: {
    ip_address?: string;
    user_agent?: string;
    sign_in_count?: number;
    email?: string;
    user_id?: string;
    [key: string]: any;
  };
  created_at: string;
  user?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  details: string[];
  timestamp_formatted: string;
}

interface FilterOptions {
  actions: string[];
  tables: string[];
  users: string[];
}

interface Filters {
  action_filter: string;
  user_filter: string;
  table_filter: string;
  date_from: string;
  date_to: string;
}

interface State {
  auditLogs: AuditLogEntry[];
  loading: boolean;
  filterOptions: FilterOptions;
  filters: Filters;
  pagination: {
    current_page: number;
    total_pages: number;
    total_count: number;
    per_page: number;
  };
}

const initialState: State = {
  auditLogs: [],
  loading: true,
  filterOptions: { actions: [], tables: [], users: [] },
  filters: { action_filter: '', user_filter: '', table_filter: '', date_from: '', date_to: '' },
  pagination: { current_page: 1, total_pages: 1, total_count: 0, per_page: 50 },
};

function auditLogReducer(state: State, action: any): State {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_AUDIT_LOGS':
      return { ...state, auditLogs: action.payload };
    case 'SET_FILTER_OPTIONS':
      return { ...state, filterOptions: action.payload };
    case 'SET_FILTERS':
      return { ...state, filters: action.payload };
    case 'SET_PAGINATION':
      return { ...state, pagination: action.payload };
    case 'UPDATE_FILTER':
      return { ...state, filters: { ...state.filters, [action.field]: action.value } };
    default:
      return state;
  }
}

// Common styles
const tableHeaderStyle = {
  fontSize: 'sm',
  fontWeight: 'semibold',
  color: 'gray.700',
  borderBottom: '1px',
  borderColor: 'gray.200',
  py: 4,
};

const tableCellStyle = {
  py: 4,
  borderColor: 'gray.100',
};

// Column definitions with translation keys
const columns = [
  { key: 'who', translationKey: 'auditLog.who', width: '200px', maxW: '200px' },
  { key: 'action', translationKey: 'auditLog.action', width: '80px', maxW: '80px' },
  { key: 'where', translationKey: 'auditLog.where', width: '140px', maxW: '140px' },
  { key: 'details', translationKey: 'auditLog.details', width: '300px', maxW: '300px' },
  { key: 'timestamp', translationKey: 'auditLog.timestamp', width: '180px', maxW: '180px' },
];

export const AuditLogScreen = observer(() => {
  const { t } = useTranslation();
  const i18nPrefix = 'auditLog';
  const [state, dispatch] = useReducer(auditLogReducer, initialState);
  const { auditLogs, loading, filterOptions, filters, pagination } = state;

  // Helper to build URL params from filters
  const buildFilterParams = (currentFilters: Filters, additionalParams = {}) => {
    const params = new URLSearchParams();
    Object.entries({ ...currentFilters, ...additionalParams })
      .filter(([_, value]) => value !== '')
      .forEach(([key, value]) => params.append(key, value.toString()));
    return params;
  };

  const fetchFilterOptions = async () => {
    try {
      const response = await fetch('/api/audit_logs/filter_options', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        dispatch({ type: 'SET_FILTER_OPTIONS', payload: data.data || { actions: [], tables: [], users: [] } });
      }
    } catch (error) {
      console.error('Error fetching filter options:', error);
    }
  };

  const fetchAuditLogs = async (page = 1, perPage = 50, currentFilters = filters) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const params = buildFilterParams(currentFilters, { page, per_page: perPage });
      const response = await fetch(`/api/audit_logs?${params.toString()}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        dispatch({ type: 'SET_AUDIT_LOGS', payload: data.data || [] });
        dispatch({ type: 'SET_PAGINATION', payload: data.meta || {} });
      }
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  useEffect(() => {
    fetchFilterOptions();
    fetchAuditLogs();
  }, []);

  const handlePageChange = (page: number) => {
    fetchAuditLogs(page, pagination.per_page, filters);
  };

  const handlePerPageChange = (perPage: number) => {
    fetchAuditLogs(1, perPage, filters);
  };

  const handleFilterChange = (filterType: keyof Filters, value: string) => {
    const newFilters = { ...filters, [filterType]: value };
    dispatch({ type: 'SET_FILTERS', payload: newFilters });
    fetchAuditLogs(1, pagination.per_page, newFilters);
  };

  const clearFilters = () => {
    const clearedFilters = { action_filter: '', user_filter: '', table_filter: '', date_from: '', date_to: '' };
    dispatch({ type: 'SET_FILTERS', payload: clearedFilters });
    fetchAuditLogs(1, pagination.per_page, clearedFilters);
  };

  const hasActiveFilters = Object.values(filters).some((value) => value !== '');

  const handleRefresh = () => {
    fetchFilterOptions();
    fetchAuditLogs(1, pagination.per_page, filters);
  };

  const handleExportCSV = async () => {
    try {
      const params = buildFilterParams(filters, { format: 'csv' });
      const response = await fetch(`/api/audit_logs.csv?${params.toString()}`, {
        method: 'GET',
        headers: { Accept: 'text/csv', 'X-CSRF-Token': getCsrfToken() },
        credentials: 'include',
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const dateStr = new Date().toISOString().split('T')[0];
        const filename = `audit_logs_${dateStr}${hasActiveFilters ? '_filtered' : ''}.csv`;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error exporting CSV:', error);
    }
  };

  const formatUserInfo = (user: any) => {
    if (!user) {
      return (
        <Box>
          <Text fontWeight="bold" color="gray.500">
            {t(`${i18nPrefix}.unknown_user`)}
          </Text>
          <Text fontSize="sm" color="gray.400">
            {t(`${i18nPrefix}.system_action`)}
          </Text>
        </Box>
      );
    }

    const name = user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : user.email;

    return (
      <Box>
        <Text fontWeight="bold">{name}</Text>
        <Text fontSize="sm" color="gray.600">
          {user.email}
        </Text>
      </Box>
    );
  };

  const formatAction = (action: string) => {
    const actionColors = {
      create: 'green',
      created: 'green',
      edit: 'blue',
      update: 'blue',
      updated: 'blue',
      delete: 'red',
      archived: 'orange',
      login: 'purple',
    };

    return (
      <Tag colorScheme={actionColors[action.toLowerCase()] || 'gray'} variant="subtle" size="sm" borderRadius="md">
        {action.charAt(0).toUpperCase() + action.slice(1)}
      </Tag>
    );
  };

  const formatDetails = (log: AuditLogEntry) => {
    // For login entries, show IP address and user agent
    if (log.action === 'login' && log.data_after) {
      const loginData = log.data_after;
      const details: string[] = [];

      if (loginData.ip_address) {
        details.push(`Login from IP: ${loginData.ip_address}`);
      }

      if (loginData.user_agent) {
        // Simplify user agent display
        const userAgent = loginData.user_agent;
        if (userAgent.includes('Chrome')) {
          details.push(`Browser: Chrome`);
        } else if (userAgent.includes('Firefox')) {
          details.push(`Browser: Firefox`);
        } else if (userAgent.includes('Safari')) {
          details.push(`Browser: Safari`);
        } else if (userAgent.includes('Edge')) {
          details.push(`Browser: Edge`);
        } else {
          details.push(`Browser: ${userAgent.substring(0, 50)}...`);
        }
      }

      if (loginData.sign_in_count) {
        details.push(`Total logins: ${loginData.sign_in_count.toLocaleString()}`);
      }

      if (details.length > 0) {
        return (
          <VStack align="start" spacing={1}>
            {details.map((detail, index) => (
              <Text key={index} fontSize="sm">
                • {detail}
              </Text>
            ))}
          </VStack>
        );
      }
    }

    // For other entries, show the processed details array
    if (log.details && log.details.length > 0) {
      return (
        <VStack align="start" spacing={1}>
          {log.details.map((detail, index) => (
            <Text key={index} fontSize="sm" wordBreak="break-word">
              • {detail}
            </Text>
          ))}
        </VStack>
      );
    }

    return <Text color="gray.500">-</Text>;
  };

  // Render helpers
  const renderTableHeader = (translationKey: string, width: string) => (
    <Th {...tableHeaderStyle} width={width}>
      {t(translationKey)}
    </Th>
  );

  const renderTableCell = (content: React.ReactNode, maxW: string, additionalProps = {}) => (
    <Td {...tableCellStyle} maxW={maxW} {...additionalProps}>
      {content}
    </Td>
  );

  if (loading && auditLogs.length === 0) {
    return <LoadingScreen />;
  }

  return (
    <Container maxW="container.lg" p={8} as="main">
      <VStack alignItems="flex-start" spacing={6} w="full">
        {/* Header */}
        <Flex justifyContent="space-between" w="full" alignItems="flex-end">
          <Heading as="h1" fontFamily="'BC Sans'" fontWeight="700" fontSize="32px" color="theme.blueAlt">
            {t(`${i18nPrefix}.title`)}
          </Heading>

          <Button
            bg="theme.darkBlue"
            color="white"
            fontFamily="'BC Sans'"
            fontWeight="400"
            fontSize="16px"
            px={4}
            py={2}
            borderRadius="4px"
            onClick={handleExportCSV}
            _hover={{ bg: 'theme.blue' }}
          >
            {t(`${i18nPrefix}.export_csv`)}
          </Button>
        </Flex>

        {/* Table Container */}
        <Box
          bg="white"
          borderRadius="md"
          shadow="sm"
          overflow="hidden"
          border="1px"
          borderColor="gray.200"
          w="full"
          overflowX="auto"
        >
          {/* Table Header */}
          <Flex justify="space-between" align="center" p={4} bg="gray.50" borderBottom="1px" borderColor="gray.200">
            <Text fontFamily="'BC Sans'" fontWeight="600" fontSize="lg" color="gray.700">
              {t(`${i18nPrefix}.audit_log`)}
            </Text>
            <Flex align="center" gap={2}>
              <IconButton
                aria-label="Refresh audit logs"
                icon={<ArrowClockwise size={16} />}
                bg="transparent"
                variant="ghost"
                size="sm"
                color="gray.600"
                onClick={handleRefresh}
                _hover={{ bg: 'gray.100' }}
              />
              <Menu>
                <MenuButton
                  as={Button}
                  leftIcon={<Funnel size={16} />}
                  bg="transparent"
                  variant="ghost"
                  size="sm"
                  color={hasActiveFilters ? 'blue.600' : 'gray.600'}
                  fontWeight={hasActiveFilters ? 'semibold' : 'normal'}
                >
                  {hasActiveFilters
                    ? `${t(`${i18nPrefix}.filter`)} (${Object.values(filters).filter((v) => v !== '').length})`
                    : t(`${i18nPrefix}.filter`)}
                </MenuButton>
                <MenuList p={4} minW="300px">
                  <VStack spacing={4} align="stretch">
                    <FormControl>
                      <FormLabel fontSize="sm">{t(`${i18nPrefix}.filter_by_action`)}</FormLabel>
                      <Select
                        size="sm"
                        value={filters.action_filter}
                        onChange={(e) => handleFilterChange('action_filter', e.target.value)}
                        placeholder="All actions"
                      >
                        {filterOptions.actions.map((action) => (
                          <option key={action} value={action}>
                            {action.charAt(0).toUpperCase() + action.slice(1)}
                          </option>
                        ))}
                      </Select>
                    </FormControl>

                    <FormControl>
                      <FormLabel fontSize="sm">{t(`${i18nPrefix}.filter_by_user`)}</FormLabel>
                      <Select
                        size="sm"
                        value={filters.user_filter}
                        onChange={(e) => handleFilterChange('user_filter', e.target.value)}
                        placeholder="All users"
                      >
                        {filterOptions.users.map((user) => (
                          <option key={user} value={user}>
                            {user}
                          </option>
                        ))}
                      </Select>
                    </FormControl>

                    <FormControl>
                      <FormLabel fontSize="sm">{t(`${i18nPrefix}.filter_by_table`)}</FormLabel>
                      <Select
                        size="sm"
                        value={filters.table_filter}
                        onChange={(e) => handleFilterChange('table_filter', e.target.value)}
                        placeholder="All tables"
                      >
                        {filterOptions.tables.map((table) => (
                          <option key={table} value={table}>
                            {table.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                          </option>
                        ))}
                      </Select>
                    </FormControl>

                    <FormControl>
                      <FormLabel fontSize="sm">{t(`${i18nPrefix}.date_range`)}</FormLabel>
                      <Flex gap={2}>
                        <Input
                          size="sm"
                          type="date"
                          value={filters.date_from}
                          onChange={(e) => handleFilterChange('date_from', e.target.value)}
                          placeholder="From date"
                        />
                        <Input
                          size="sm"
                          type="date"
                          value={filters.date_to}
                          onChange={(e) => handleFilterChange('date_to', e.target.value)}
                          placeholder="To date"
                        />
                      </Flex>
                    </FormControl>

                    {hasActiveFilters && (
                      <>
                        <Divider />
                        <Button size="sm" variant="ghost" onClick={clearFilters}>
                          {t(`${i18nPrefix}.clear_filters`)}
                        </Button>
                      </>
                    )}
                  </VStack>
                </MenuList>
              </Menu>
            </Flex>
          </Flex>

          {/* Table Content */}
          {loading ? (
            <Flex justify="center" p={8}>
              <SharedSpinner />
            </Flex>
          ) : (
            <Table variant="simple" size="sm" minW="800px">
              <Thead bg="gray.50">
                <Tr>{columns.map((col) => renderTableHeader(col.translationKey, col.width))}</Tr>
              </Thead>
              <Tbody>
                {auditLogs.map((log) => (
                  <Tr key={log.id} _hover={{ bg: 'gray.50' }} borderBottom="1px" borderColor="gray.100">
                    {renderTableCell(formatUserInfo(log.user), '200px')}
                    {renderTableCell(formatAction(log.action), '80px')}
                    {renderTableCell(
                      <Text fontSize="sm" fontWeight="medium" color="gray.700" wordBreak="break-word">
                        {log.table_name}
                      </Text>,
                      '140px',
                    )}
                    {renderTableCell(<Box maxW="300px">{formatDetails(log)}</Box>, '300px')}
                    {renderTableCell(
                      <Text fontSize="sm" color="gray.600" whiteSpace="nowrap">
                        {log.timestamp_formatted}
                      </Text>,
                      '180px',
                    )}
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}

          {auditLogs.length === 0 && !loading && (
            <Flex justify="center" p={8}>
              <Text color="gray.500">{t(`${i18nPrefix}.no_data`)}</Text>
            </Flex>
          )}

          <Flex justify="space-between" align="center" p={4} bg="gray.50" borderTop="1px" borderColor="gray.200">
            <Flex align="center" gap={4}>
              <PerPageSelect
                countPerPage={pagination.per_page}
                handleCountPerPageChange={handlePerPageChange}
                totalCount={pagination.total_count}
              />
              <Text fontSize="sm" color="gray.600">
                {pagination.total_count} {t(`${i18nPrefix}.total_items`)}
              </Text>
            </Flex>

            <Paginator
              current={pagination.current_page}
              total={pagination.total_count}
              totalPages={pagination.total_pages}
              pageSize={pagination.per_page}
              handlePageChange={handlePageChange}
            />
          </Flex>
        </Box>
      </VStack>
    </Container>
  );
});
