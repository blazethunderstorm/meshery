import React, { useContext, useEffect, useRef, useState } from 'react';
import { CustomTooltip, NoSsr } from '@sistent/sistent';
import {
  Divider,
  ClickAwayListener,
  Typography,
  Button,
  CircularProgress,
  Box,
  useTheme,
  Checkbox,
  Collapse,
  IconButton,
} from '@sistent/sistent';
import Filter from './filter';
import BellIcon from '../../assets/icons/BellIcon.js';
import { iconMedium } from '../../css/icons.styles';
import {
  NOTIFICATION_CENTER_TOGGLE_CLASS,
  SEVERITY,
  SEVERITY_STYLE,
  STATUS,
  STATUS_STYLE,
} from './constants';
import Notification from './notification';
import {
  Container,
  DarkBackdrop,
  NotificationButton,
  NotificationContainer,
  SeverityChips,
  SeverityChip,
  SideList,
  StyledBadge,
  StyledNotificationDrawer,
  Title,
  TitleBellIcon,
} from './notificationCenter.style';
import {
  closeNotificationCenter,
  loadEvents,
  loadNextPage,
  selectAreAllEventsChecked,
  selectCheckedEvents,
  selectEvents,
  selectSeverity,
  toggleNotificationCenter,
  updateCheckAllEvents,
} from '../../store/slices/events';
import {
  useDeleteEventsMutation,
  useGetEventsSummaryQuery,
  useLazyGetEventsQuery,
  useUpdateEventsMutation,
} from '../../rtk-query/notificationCenter';
import DoneIcon from '../../assets/icons/DoneIcon';
import { hasClass } from '../../utils/Elements';
import ReadIcon from '../../assets/icons/ReadIcon';
import UnreadIcon from '../../assets/icons/UnreadIcon';
import DeleteIcon from '../../assets/icons/DeleteIcon';
import { useNotification } from '../../utils/hooks/useNotification';
import { useActorRef } from '@xstate/react';
import { operationsCenterActor } from 'machines/operationsCenter';
import { useDispatch, useSelector } from 'react-redux';
import { ErrorBoundary } from '@sistent/sistent';
import CustomErrorFallback from '../General/ErrorBoundary';
import { alpha } from '@mui/system';

export const NotificationCenterContext = React.createContext({
  drawerAnchorEl: null,
  setDrawerAnchor: () => {},
  toggleButtonRef: null,
  operationsCenterActorRef: null,
});

export const NotificationCenterProvider = ({ children }) => {
  const [drawerAnchorEl, setDrawerAnchor] = useState(null);
  const toggleButtonRef = useRef(null);
  const { notify } = useNotification();
  const operationsCenterActorRef = useActorRef(operationsCenterActor, {
    input: {
      notify,
    },
  });
  return (
    <NotificationCenterContext.Provider
      value={{
        drawerAnchorEl,
        setDrawerAnchor,
        toggleButtonRef,
        operationsCenterActorRef,
      }}
    >
      {children}
      <NotificationCenter />
    </NotificationCenterContext.Provider>
  );
};

const getSeverityCount = (count_by_severity_level, severity) => {
  return count_by_severity_level.find((item) => item.severity === severity)?.count || 0;
};

const EmptyState = () => {
  const theme = useTheme();
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1rem',
        marginY: '5rem',
      }}
    >
      <DoneIcon height="10rem" width="8rem" fill={theme.palette.icon.secondary} />
      <Typography variant="h6" sx={{ margin: 'auto', color: theme.palette.text.primary }}>
        {' '}
        No notifications to show{' '}
      </Typography>
    </Box>
  );
};

const NavbarNotificationIcon = () => {
  const { data, error, isLoading } = useGetEventsSummaryQuery({
    status: STATUS.UNREAD,
  });
  if (error || (!data && !isLoading)) {
    console.log(
      '[NavbarNotificationIcon] Error fetching notification summary for NotificationIconCount',
      error,
    );
  }

  const count_by_severity_level = data?.count_by_severity_level || [];

  const currentTopSeverity =
    getSeverityCount(count_by_severity_level, SEVERITY.ERROR) > 0
      ? SEVERITY.ERROR
      : getSeverityCount(count_by_severity_level, SEVERITY.WARNING) > 0
        ? SEVERITY.WARNING
        : null;
  const currentSeverityStyle = currentTopSeverity ? SEVERITY_STYLE[currentTopSeverity] : null;
  const topSeverityCount = getSeverityCount(count_by_severity_level, currentTopSeverity);
  if (currentTopSeverity) {
    return (
      <StyledBadge
        id="notification-badge"
        badgeContent={topSeverityCount}
        badgeColor={currentSeverityStyle?.color}
      >
        <currentSeverityStyle.icon {...iconMedium} fill="#fff" />
      </StyledBadge>
    );
  }
  return <BellIcon className={iconMedium} fill="#fff" />;
};

const NotificationCountChip = ({ notificationStyle, count, type, handleClick, severity }) => {
  const theme = useTheme();
  const selectedSeverity = useSelector(selectSeverity);
  const darkColor = notificationStyle?.darkColor || notificationStyle?.color;
  const chipStyles = {
    fill: theme.palette.mode === 'dark' ? darkColor : notificationStyle?.color,
    height: '20px',
    width: '20px',
  };
  count = Number(count).toLocaleString('en', { useGrouping: true });
  return (
    <CustomTooltip title={type} placement="bottom">
      <div>
        <Button
          style={{
            backgroundColor: alpha(chipStyles.fill, 0.2),
            border:
              selectedSeverity === severity
                ? `solid 2px ${chipStyles.fill}`
                : 'solid 2px transparent',
          }}
          onClick={handleClick}
        >
          <SeverityChip>
            {<notificationStyle.icon {...chipStyles} />}
            <span>{count}</span>
          </SeverityChip>
        </Button>
      </div>
    </CustomTooltip>
  );
};

const Header = ({ handleFilter, handleClose }) => {
  const uiConfig = useSelector((state) => state.events.ui);
  const { data } = useGetEventsSummaryQuery({
    status: STATUS.UNREAD,
  });
  const { count_by_severity_level, read_count } = data || {
    count_by_severity_level: [],
    total_count: 0,
    read_count: 0,
  };

  const onClickSeverity = (severity) => {
    handleFilter({
      severity: [severity],
      status: STATUS.UNREAD,
    });
  };

  const onClickStatus = (status) => {
    handleFilter({
      status: status,
    });
  };

  const Icon = uiConfig.icon || BellIcon;
  return (
    <NotificationContainer>
      <Title>
        <TitleBellIcon onClick={handleClose}>
          <Icon height="30" width="30" fill="#fff" />
        </TitleBellIcon>
        <Typography variant="h6">{uiConfig.title || 'Notifications'}</Typography>
      </Title>
      <SeverityChips>
        {Object.values(SEVERITY).map((severity) => (
          <NotificationCountChip
            key={severity}
            severity={severity}
            handleClick={() => onClickSeverity(severity)}
            notificationStyle={SEVERITY_STYLE[severity]}
            type={`Unread ${severity}(s)`}
            count={getSeverityCount(count_by_severity_level, severity)}
          />
        ))}
        <NotificationCountChip
          notificationStyle={STATUS_STYLE[STATUS.READ]}
          handleClick={() => onClickStatus(STATUS.READ)}
          type={STATUS.READ}
          severity={STATUS.READ}
          count={read_count}
        />
      </SeverityChips>
    </NotificationContainer>
  );
};

const Loading = () => {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
      <CircularProgress />
    </Box>
  );
};

const BulkActions = () => {
  const checkedEvents = useSelector(selectCheckedEvents);
  const noEventsPresent = useSelector((state) => selectEvents(state).length === 0);
  const [deleteEvents, { isLoading: isDeleting }] = useDeleteEventsMutation();
  const [updateEvents, { isLoading: isUpdatingStatus }] = useUpdateEventsMutation();

  // stores which update is currently going on , usefull to know which action is going
  // if multiple updates can be triggered from same mutator , only single bulk action is allowed at a time
  const [curentOngoingUpdate, setCurrentOngoingUpdate] = useState(null);
  const isActionInProgress = isDeleting || isUpdatingStatus;

  const dispatch = useDispatch();
  const areAllEventsChecked = useSelector(selectAreAllEventsChecked);
  const handleCheckboxChange = (_e, v) => {
    dispatch(updateCheckAllEvents(v));
  };
  const resetSelection = () => {
    dispatch(updateCheckAllEvents(false));
  };

  const handleDelete = () => {
    deleteEvents({
      ids: checkedEvents.map((e) => e.id),
    }).then(resetSelection);
  };

  const handleChangeStatus = (status) => {
    setCurrentOngoingUpdate(status);
    updateEvents({
      ids: checkedEvents.map((e) => e.id),
      updatedFields: {
        status,
      },
    }).then(resetSelection);
  };

  const BulkActionButton = ({ isLoading, isDisabled, tooltip, Icon, onClick }) => {
    const disabled = isDisabled || isActionInProgress;
    if (isLoading) {
      return (
        <div style={iconMedium}>
          <CircularProgress size={iconMedium.height} />
        </div>
      );
    }
    return (
      <CustomTooltip title={tooltip} placement="top">
        <div>
          <IconButton onClick={onClick} disabled={disabled}>
            <Icon
              {...iconMedium}
              style={{
                opacity: disabled ? 0.5 : 1,
              }}
              fill="currentColor"
            />
          </IconButton>
        </div>
      </CustomTooltip>
    );
  };

  if (noEventsPresent) {
    return null;
  }

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0.15rem',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <Checkbox checked={areAllEventsChecked} color="primary" onChange={handleCheckboxChange} />
        <Typography variant="body2">
          {areAllEventsChecked ? `Selected ${checkedEvents.length} notifications` : 'Select All'}
        </Typography>
      </Box>
      <Collapse in={checkedEvents.length > 0}>
        <Box sx={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <BulkActionButton
            tooltip="Delete selected notifications"
            Icon={DeleteIcon}
            isLoading={isDeleting}
            onClick={handleDelete}
          />
          <BulkActionButton
            tooltip="Mark selected notifications as read"
            Icon={ReadIcon}
            isLoading={isUpdatingStatus && curentOngoingUpdate == STATUS.READ}
            onClick={() => handleChangeStatus(STATUS.READ)}
          />
          <BulkActionButton
            tooltip="Mark selected notifications as unread"
            Icon={UnreadIcon}
            isLoading={isUpdatingStatus && curentOngoingUpdate == STATUS.UNREAD}
            onClick={() => handleChangeStatus(STATUS.UNREAD)}
          />
        </Box>
      </Collapse>
    </Box>
  );
};

const EventsView = ({ handleLoadNextPage, isFetching, hasMore }) => {
  const events = useSelector(selectEvents);
  // const page = useSelector((state) => state.events.current_view.page);
  const lastEventRef = useRef(null);
  const intersectionObserver = useRef(
    new IntersectionObserver(
      (entries) => {
        if (isFetching && !hasMore) {
          return;
        }
        const firstEntry = entries[0];
        if (firstEntry.isIntersecting) {
          handleLoadNextPage();
        }
      },
      { threshold: 1 },
    ),
  );

  useEffect(() => {
    const currentObserver = intersectionObserver.current;
    if (lastEventRef.current) {
      currentObserver.observe(lastEventRef.current);
    }
    return () => {
      if (lastEventRef.current) {
        currentObserver.unobserve(lastEventRef.current);
      }
    };
  }, [lastEventRef.current]);

  return (
    <>
      {events.map((event, idx) => {
        return (
          <div key={event.id + idx}>
            <Notification eventData={event} event_id={event.id} />
          </div>
        );
      })}

      {events.length === 0 && <EmptyState />}

      <div ref={lastEventRef}></div>
      {isFetching && hasMore && <Loading />}
    </>
  );
};

const NotificationCenterDrawer = () => {
  const dispatch = useDispatch();
  const {
    toggleButtonRef,
    drawerAnchorEl: anchorEl,
    setDrawerAnchor: setAnchorEl,
  } = useContext(NotificationCenterContext);
  const isNotificationCenterOpen = useSelector((state) => state.events.isNotificationCenterOpen);
  const [fetchEvents, { isFetching }] = useLazyGetEventsQuery();
  const hasMore = useSelector((state) => state.events.current_view.has_more);
  const initialViewToLoad = useSelector((state) => state.events.view_to_fetch_on_open);

  const [isLoadingFilters, setIsLoadingFilters] = useState(false); // whether we are loading filters and basically should show loading spinner as we are loading the whole page

  useEffect(() => {
    dispatch(
      loadEvents(fetchEvents, initialViewToLoad?.page || 0, initialViewToLoad?.filters || {}),
    );
  }, []);

  const loadMore = () => {
    dispatch(loadNextPage(fetchEvents));
  };

  const handleClose = () => {
    if (!isNotificationCenterOpen) {
      return;
    }
    dispatch(closeNotificationCenter());
    setAnchorEl(null);
  };
  // const { showFullNotificationCenter } = props;
  const open = Boolean(anchorEl) || isNotificationCenterOpen;
  const handleFilter = async (filters) => {
    setIsLoadingFilters(true);
    await dispatch(loadEvents(fetchEvents, 0, filters));
    setIsLoadingFilters(false);
  };
  const drawerRef = useRef();
  const clickwayHandler = (e) => {
    // checks if event has occured/bubbled up from clicking inside notificationcenter or on the bell icon
    if (drawerRef.current.contains(e.target) || toggleButtonRef.current.contains(e.target)) {
      return;
    }
    // check for element with toggle class
    if (hasClass(e.target, NOTIFICATION_CENTER_TOGGLE_CLASS)) {
      return;
    }
    // check for svg icon (special case) , not checking the toggle class as it is not added to svg
    if (e.target?.className?.baseVal?.includes('MuiSvgIcon')) {
      return;
    }
    handleClose();
  };

  return (
    <>
      <DarkBackdrop open={isNotificationCenterOpen} />
      <ClickAwayListener onClickAway={clickwayHandler}>
        <StyledNotificationDrawer
          anchor="right"
          variant="persistent"
          open={open}
          ref={drawerRef}
          isNotificationCenterOpen={isNotificationCenterOpen}
          BackdropComponent={<DarkBackdrop open={isNotificationCenterOpen} />}
        >
          <div>
            <div>
              <SideList>
                <Header handleFilter={handleFilter} handleClose={handleClose}></Header>
                <Divider light />
                <Container>
                  <Filter handleFilter={handleFilter}></Filter>
                  <BulkActions />

                  {isLoadingFilters ? (
                    <Loading />
                  ) : (
                    <EventsView
                      handleLoadNextPage={loadMore}
                      isFetching={isFetching}
                      hasMore={hasMore}
                    />
                  )}
                </Container>
              </SideList>
            </div>
          </div>
        </StyledNotificationDrawer>
      </ClickAwayListener>
    </>
  );
};

const NotificationDrawerButton_ = () => {
  const { setDrawerAnchor, toggleButtonRef } = useContext(NotificationCenterContext);
  const dispatch = useDispatch();
  const handleToggle = () => {
    dispatch(toggleNotificationCenter());
  };
  return (
    <div ref={toggleButtonRef}>
      <NotificationButton
        id="notification-button"
        color="inherit"
        onClick={handleToggle}
        onMouseOver={(e) => {
          e.preventDefault();
          setDrawerAnchor(e.currentTarget);
        }}
        onMouseLeave={(e) => {
          e.preventDefault();
          setDrawerAnchor(null);
        }}
      >
        <NavbarNotificationIcon />
      </NotificationButton>
    </div>
  );
};

export const NotificationDrawerButton = () => {
  return <NotificationDrawerButton_ />;
};

const NotificationCenter = (props) => {
  const isOpen = useSelector((state) => state.events.isNotificationCenterOpen);

  if (!isOpen) {
    return null;
  }

  return (
    <NoSsr>
      <ErrorBoundary customFallback={CustomErrorFallback}>
        <NotificationCenterDrawer {...props} />
      </ErrorBoundary>
    </NoSsr>
  );
};

export default NotificationCenter;
