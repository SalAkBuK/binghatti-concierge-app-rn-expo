import type {
  AuthContextType,
} from "./auth-context";
import type { NotificationsContextType } from "./notifications-context";
import { useAmenityModule } from "./modules/amenities";
import { useVisitorModule } from "./modules/visitors";

type UseAmenityVisitorAppStateParams = {
  auth: AuthContextType;
  notifications: NotificationsContextType;
};

export const useAmenityVisitorAppState = ({
  auth,
  notifications,
}: UseAmenityVisitorAppStateParams) => {
  const {
    state: { amenities, amenityConfigs, bookings },
    actions: amenityActions,
  } = useAmenityModule({ auth, notifications });
  const {
    state: {
      visitors,
      residentVisitors,
      residentVisitorsLoading,
      residentVisitorsError,
      visitorPasses,
      visitorLogs,
    },
    actions: visitorActions,
  } = useVisitorModule({ auth, notifications });

  return {
    amenities,
    amenityConfigs,
    bookings,
    visitors,
    residentVisitors,
    residentVisitorsLoading,
    residentVisitorsError,
    visitorPasses,
    visitorLogs,
    getAmenities: amenityActions.getAmenities,
    getAmenityById: amenityActions.getAmenityById,
    getAmenityConfigs: amenityActions.getAmenityConfigs,
    getAmenityConfigsByBuilding: amenityActions.getAmenityConfigsByBuilding,
    updateAmenityConfig: amenityActions.updateAmenityConfig,
    createAmenityConfig: amenityActions.createAmenityConfig,
    createBooking: amenityActions.createBooking,
    getBookings: amenityActions.getBookings,
    cancelBooking: amenityActions.cancelBooking,
    getBookingsByBuilding: amenityActions.getBookingsByBuilding,
    registerVisitor: visitorActions.registerVisitor,
    getVisitors: visitorActions.getVisitors,
    cancelVisitor: visitorActions.cancelVisitor,
    fetchResidentVisitors: visitorActions.fetchResidentVisitors,
    getResidentVisitors: visitorActions.getResidentVisitors,
    getResidentVisitor: visitorActions.getResidentVisitor,
    createResidentVisitor: visitorActions.createResidentVisitor,
    updateResidentVisitor: visitorActions.updateResidentVisitor,
    cancelResidentVisitor: visitorActions.cancelResidentVisitor,
    clearResidentVisitorsError: visitorActions.clearResidentVisitorsError,
    appendVisitorPass: visitorActions.appendVisitorPass,
    getVisitorPasses: visitorActions.getVisitorPasses,
    getVisitorPassesByBuilding: visitorActions.getVisitorPassesByBuilding,
    approveVisitorPass: visitorActions.approveVisitorPass,
    rejectVisitorPass: visitorActions.rejectVisitorPass,
    markVisitorPassCheckIn: visitorActions.markVisitorPassCheckIn,
    markVisitorPassComplete: visitorActions.markVisitorPassComplete,
    cancelVisitorPass: visitorActions.cancelVisitorPass,
    addVisitorLog: visitorActions.addVisitorLog,
    updateVisitorLog: visitorActions.updateVisitorLog,
    getVisitorLogsByBuilding: visitorActions.getVisitorLogsByBuilding,
    getVisitorsByBuilding: visitorActions.getVisitorsByBuilding,
  };
};
