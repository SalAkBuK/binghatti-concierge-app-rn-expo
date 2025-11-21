import { Ionicons } from "@expo/vector-icons";
import type { ReactElement } from "react";
import React from "react";
import { Modal, SafeAreaView, ScrollView, Text, TouchableOpacity, View, type ViewStyle } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";

import type { Building, BuildingEmployee, BuildingUnit, RatingSummary, ServiceProviderProfile, UnitType, VisitorLog } from "../../../../lib/types";
import { formatDate } from "../../../../lib/utils/helpers";
import { styles } from "./_styles";
import { getStatusColor } from "../utils/buildingHelpers";

interface BuildingActions {
  getUnitsByBuilding?: (buildingId: string) => BuildingUnit[];
  getBuildingEmployees?: (buildingId: string) => BuildingEmployee[];
  getVisitorLogsByBuilding?: (buildingId: string) => VisitorLog[];
  getRatingSummaries?: (role: "service_provider") => RatingSummary[];
  getServiceProviders?: () => ServiceProviderProfile[] | undefined;
  getUnitTypeById?: (id: string) => UnitType | undefined;
}

interface BuildingDetailsModalProps {
  visible: boolean;
  building: Building | null;
  onClose: () => void;
  actions: BuildingActions;
  unitTypes?: UnitType[];
  canManageBuildings: boolean;
  onAssignManager: (building: Building) => void;
}

export function BuildingDetailsModal({
  visible,
  building,
  onClose,
  actions,
  unitTypes,
  canManageBuildings,
  onAssignManager,
}: BuildingDetailsModalProps) {
  const resolveUnitType = (id: string): UnitType | undefined => {
    return actions.getUnitTypeById?.(id) || unitTypes?.find((type) => type.id === id);
  };

  const getUnitStatusStyle = (status: BuildingUnit["status"]): ViewStyle => {
    const statusMap: Record<BuildingUnit["status"], ViewStyle> = {
      occupied: { backgroundColor: "#DCFCE7" },
      vacant: { backgroundColor: "#DBEAFE" },
      maintenance: { backgroundColor: "#FEF3C7" },
    };
    return statusMap[status];
  };

  const getVisitorStatusStyle = (status: VisitorLog["status"]): ViewStyle => {
    const statusMap: Record<VisitorLog["status"], ViewStyle> = {
      expected: { backgroundColor: "#E0EAFF" },
      checked_in: { backgroundColor: "#DCFCE7" },
      completed: { backgroundColor: "#E5E7EB" },
      cancelled: { backgroundColor: "#FEE2E2" },
    };
    return statusMap[status];
  };

  const renderUnitItem = (unit: BuildingUnit) => {
    const unitType = resolveUnitType(unit.typeId);
    return (
      <View key={unit.id} style={styles.detailCardRow}>
        <View style={styles.detailCardRowLeft}>
          <Text style={styles.detailCardTitle}>{unit.unitNumber}</Text>
          <Text style={styles.detailCardSubtitle}>
            {unitType?.name || "Unknown type"} • Floor {unit.floor}
          </Text>
        </View>
        <View style={styles.detailCardRowRight}>
        <View
          style={[styles.statusBadge, getUnitStatusStyle(unit.status)]}
        >
            <Text style={styles.statusBadgeText}>{unit.status.toUpperCase()}</Text>
          </View>
          {unit.lastInspectionDate && (
            <Text style={styles.detailMeta}>
              Last inspection {formatDate(unit.lastInspectionDate)}
            </Text>
          )}
        </View>
      </View>
    );
  };

  const renderEmployeeItem = (employee: BuildingEmployee) => (
    <View key={employee.id} style={styles.detailCardRow}>
      <View style={styles.detailCardRowLeft}>
        <Text style={styles.detailCardTitle}>{employee.name}</Text>
        <Text style={styles.detailCardSubtitle}>
          {employee.role} • Shift: {employee.shift || "N/A"}
        </Text>
      </View>
      <View style={styles.detailCardRowRight}>
        <Text style={styles.detailMeta}>{employee.phone}</Text>
        {employee.rating && (
          <Text style={styles.detailMeta}>
            {employee.rating.toFixed(1)} ★ ({employee.jobsCompleted || 0} jobs)
          </Text>
        )}
      </View>
    </View>
  );

  const renderServiceProviderItem = (provider: ServiceProviderProfile) => (
    <View key={provider.id} style={styles.detailCardRow}>
      <View style={styles.detailCardRowLeft}>
        <Text style={styles.detailCardTitle}>{provider.name}</Text>
        <Text style={styles.detailCardSubtitle}>{provider.specialty}</Text>
      </View>
      <View style={styles.detailCardRowRight}>
        <Text style={styles.detailMeta}>{provider.rating.toFixed(1)} ★</Text>
        <Text style={styles.detailMeta}>{provider.jobsCompleted} jobs</Text>
      </View>
    </View>
  );

  const renderVisitorLogItem = (log: VisitorLog) => (
    <View key={log.id} style={styles.detailCardRow}>
      <View style={styles.detailCardRowLeft}>
        <Text style={styles.detailCardTitle}>{log.name}</Text>
        <Text style={styles.detailCardSubtitle}>
          {log.type === "delivery" ? log.company || "Delivery" : "Visitor"} • Unit{" "}
          {log.unitNumber || "-"}
        </Text>
      </View>
      <View style={styles.detailCardRowRight}>
        <View
          style={[styles.statusBadge, getVisitorStatusStyle(log.status)]}
        >
          <Text style={styles.statusBadgeText}>{log.status.toUpperCase()}</Text>
        </View>
        <Text style={styles.detailMeta}>{formatDate(log.expectedArrival)}</Text>
      </View>
    </View>
  );

  // Helper function to count units by bedroom type
  const countUnitsByBedrooms = (units: BuildingUnit[]) => {
    const counts = {
      studios: 0,
      oneBedroom: 0,
      twoBedroom: 0,
      threeBedroom: 0,
      fourPlusBedroom: 0,
      commercial: 0,
    };

    units.forEach((unit) => {
      const bedrooms = unit.bedrooms ?? 0;
      if (bedrooms === 0) {
        counts.studios++;
      } else if (bedrooms === 1) {
        counts.oneBedroom++;
      } else if (bedrooms === 2) {
        counts.twoBedroom++;
      } else if (bedrooms === 3) {
        counts.threeBedroom++;
      } else if (bedrooms >= 4) {
        counts.fourPlusBedroom++;
      }
      // Note: commercial units detection could be enhanced with unit type data
    });

    return counts;
  };

  const renderDetailsModalContent = () => {
    if (!building) return null;

    const buildingUnitsData =
      actions.getUnitsByBuilding?.(building.id) || [];
    const occupiedUnits = buildingUnitsData.filter(
      (unit) => unit.status === "occupied",
    ).length;
    const vacantUnits = buildingUnitsData.filter(
      (unit) => unit.status === "vacant",
    ).length;
    const maintenanceUnits = buildingUnitsData.filter(
      (unit) => unit.status === "maintenance",
    ).length;
    const employees =
      actions.getBuildingEmployees?.(building.id) || [];
    const visitorEntries =
      actions.getVisitorLogsByBuilding?.(building.id) || [];
    const providerSummaries =
      actions.getRatingSummaries?.("service_provider") || [];
    const providers =
      actions.getServiceProviders?.() as ServiceProviderProfile[] | undefined;
    const providerCards =
      providerSummaries.length > 0 && providers
        ? (providerSummaries
            .slice(0, 3)
            .map((summary) => {
              const provider =
                providers.find(
                  (sp) =>
                    sp.id === summary.entityId || sp.userId === summary.entityId,
                ) || providers.find((sp) => sp.userId === summary.entityId);
              if (!provider) return null;
              return renderServiceProviderItem(provider);
            })
            .filter(Boolean) as ReactElement[])
        : [];

    const occupancyRate = buildingUnitsData.length > 0 
      ? Math.round((occupiedUnits / buildingUnitsData.length) * 100)
      : 0;

    const statusColors = getStatusColor(building.status);

    return (
      <SafeAreaView style={styles.detailsModalContainer}>
        {/* Fixed Header with Gradient */}
        <View style={styles.detailsModalHeader}>
          <View style={styles.detailsHeaderTop}>
            <TouchableOpacity 
              onPress={onClose} 
              style={styles.detailsCloseButton}
            >
              <Ionicons name="close-circle" size={32} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={[styles.detailsStatusBadge, { backgroundColor: statusColors.bg }]}>
              <Text style={[styles.detailsStatusText, { color: statusColors.text }]}>
                {building.status.toUpperCase()}
              </Text>
            </View>
          </View>

          <View style={styles.detailsHeaderContent}>
            <View style={styles.buildingIconContainer}>
              <Ionicons name="business" size={32} color="#7034FF" />
            </View>
            <Text style={styles.detailsBuildingName}>{building.name}</Text>
            <View style={styles.detailsLocationRow}>
              <Ionicons name="location" size={16} color="#9CA3AF" />
              <Text style={styles.detailsLocation}>
                {building.address}, {building.city}
              </Text>
            </View>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.detailsModalScrollContent}
        >
          {/* Manager Card */}
          <Animated.View entering={FadeInDown.delay(50).duration(300)} style={styles.detailsManagerCard}>
            <View style={styles.detailsManagerHeader}>
              <View style={styles.detailsManagerIconWrapper}>
                <Ionicons name="person-circle" size={24} color="#7034FF" />
              </View>
              <View style={styles.detailsManagerInfo}>
                <Text style={styles.detailsManagerLabel}>Building Manager</Text>
                <Text style={styles.detailsManagerName}>
                  {building.managerName || "Not assigned"}
                </Text>
              </View>
            </View>
            {canManageBuildings && (
              <TouchableOpacity
                style={styles.detailsAssignButton}
                onPress={() => {
                  setShowDetailsModal(false);
                  onAssignManager(building);
                }}
              >
                <Ionicons name="people-outline" size={18} color="#7034FF" />
                <Text style={styles.detailsAssignButtonText}>
                  {building.managerName ? "Change" : "Assign"}
                </Text>
              </TouchableOpacity>
            )}
          </Animated.View>

          {/* Capacity Progress Card */}
          <Animated.View entering={FadeInDown.delay(80).duration(300)} style={styles.detailsCapacityCard}>
            <View style={styles.detailsCapacityHeader}>
              <View style={styles.detailsCapacityIconWrapper}>
                <Ionicons name="layers" size={20} color="#7034FF" />
              </View>
              <View style={styles.detailsCapacityInfo}>
                <Text style={styles.detailsCapacityLabel}>Unit Capacity</Text>
                <Text style={styles.detailsCapacityValue}>
                  {buildingUnitsData.length} / {building.totalUnits} units created
                </Text>
              </View>
            </View>
            <View style={styles.detailsProgressBar}>
              <View
                style={[
                  styles.detailsProgressFill,
                  {
                    width: `${Math.min((buildingUnitsData.length / building.totalUnits) * 100, 100)}%`,
                    backgroundColor:
                      buildingUnitsData.length >= building.totalUnits
                        ? "#DC2626"
                        : buildingUnitsData.length / building.totalUnits >= 0.9
                        ? "#F59E0B"
                        : "#10B981",
                  },
                ]}
              />
            </View>
            <Text style={styles.detailsCapacitySubtext}>
              {building.totalUnits - buildingUnitsData.length} slots remaining
            </Text>
          </Animated.View>

          {/* Stats Grid */}
          <Animated.View entering={FadeInDown.delay(100).duration(300)} style={styles.detailsStatsGrid}>
            <View style={[styles.detailsStatCard, styles.detailsStatCardSuccess]}>
              <View style={styles.detailsStatIconWrapper}>
                <Ionicons name="checkmark-circle" size={24} color="#10B981" />
              </View>
              <Text style={styles.detailsStatValue}>{occupiedUnits}</Text>
              <Text style={styles.detailsStatLabel}>Occupied</Text>
              <View style={styles.detailsOccupancyBar}>
                <View style={[styles.detailsOccupancyFill, { width: `${occupancyRate}%` }]} />
              </View>
              <Text style={styles.detailsOccupancyText}>{occupancyRate}% Occupancy</Text>
            </View>

            <View style={[styles.detailsStatCard, styles.detailsStatCardInfo]}>
              <View style={styles.detailsStatIconWrapper}>
                <Ionicons name="key" size={24} color="#3B82F6" />
              </View>
              <Text style={styles.detailsStatValue}>{vacantUnits}</Text>
              <Text style={styles.detailsStatLabel}>Vacant</Text>
              <Text style={styles.detailsStatMeta}>
                {buildingUnitsData.length > 0
                  ? `${Math.round((vacantUnits / buildingUnitsData.length) * 100)}% available`
                  : "0% available"}
              </Text>
            </View>

            <View style={[styles.detailsStatCard, styles.detailsStatCardWarning]}>
              <View style={styles.detailsStatIconWrapper}>
                <Ionicons name="construct" size={24} color="#F59E0B" />
              </View>
              <Text style={styles.detailsStatValue}>{maintenanceUnits}</Text>
              <Text style={styles.detailsStatLabel}>Maintenance</Text>
              <Text style={styles.detailsStatMeta}>Currently offline</Text>
            </View>
          </Animated.View>

          {/* Unit Breakdown Section */}
          {building.unitBreakdown && (
            <Animated.View entering={FadeInDown.delay(130).duration(300)} style={styles.detailsSection}>
              <View style={styles.detailsSectionHeader}>
                <Ionicons name="pie-chart" size={20} color="#1F2937" />
                <Text style={styles.detailsSectionTitle}>Unit Breakdown</Text>
                <View style={[styles.detailsCountBadge, { backgroundColor: "#7034FF" }]}>
                  <Text style={styles.detailsCountBadgeText}>Plan</Text>
                </View>
              </View>

              <View style={styles.breakdownDisplayContainer}>
                {(() => {
                  const breakdown = building.unitBreakdown;
                  const actualCounts = countUnitsByBedrooms(buildingUnitsData);
                  const breakdownItems = [
                    { key: 'studios', label: 'Studios', planned: breakdown.studios, actual: actualCounts.studios, color: '#8B5CF6' },
                    { key: 'oneBedroom', label: '1 Bedroom', planned: breakdown.oneBedroom, actual: actualCounts.oneBedroom, color: '#06B6D4' },
                    { key: 'twoBedroom', label: '2 Bedrooms', planned: breakdown.twoBedroom, actual: actualCounts.twoBedroom, color: '#10B981' },
                    { key: 'threeBedroom', label: '3 Bedrooms', planned: breakdown.threeBedroom, actual: actualCounts.threeBedroom, color: '#F59E0B' },
                    { key: 'fourPlusBedroom', label: '4+ Bedrooms', planned: breakdown.fourPlusBedroom, actual: actualCounts.fourPlusBedroom, color: '#EF4444' },
                    { key: 'commercial', label: 'Commercial', planned: breakdown.commercial, actual: actualCounts.commercial, color: '#6B7280' },
                  ].filter(item => item.planned && item.planned > 0);

                  const totalPlanned = breakdownItems.reduce((sum, item) => sum + (item.planned || 0), 0);
                  const totalActual = breakdownItems.reduce((sum, item) => sum + item.actual, 0);
                  const totalProgress = totalPlanned > 0 ? Math.round((totalActual / totalPlanned) * 100) : 0;

                  return (
                    <>
                      {breakdownItems.map((item, index) => {
                        const progress = item.planned ? Math.round((item.actual / item.planned) * 100) : 0;
                        const isComplete = item.actual >= (item.planned || 0);
                        const isOverflow = item.actual > (item.planned || 0);

                        return (
                          <View key={item.key} style={styles.breakdownItem}>
                            <View style={styles.breakdownItemHeader}>
                              <View style={styles.breakdownItemLeft}>
                                <View style={[styles.breakdownDot, { backgroundColor: item.color }]} />
                                <Text style={styles.breakdownLabel}>{item.label}</Text>
                              </View>
                              <View style={styles.breakdownItemRight}>
                                <Text style={[styles.breakdownCount, isOverflow && styles.breakdownCountOverflow]}>
                                  {item.actual}
                                </Text>
                                <Text style={styles.breakdownCountSeparator}>/</Text>
                                <Text style={styles.breakdownCountPlanned}>{item.planned}</Text>
                                <Text style={[styles.breakdownProgress, isComplete && styles.breakdownProgressComplete]}>
                                  {progress}%
                                </Text>
                              </View>
                            </View>
                            <View style={styles.breakdownBar}>
                              <View
                                style={[
                                  styles.breakdownBarFill,
                                  {
                                    width: `${Math.min(progress, 100)}%`,
                                    backgroundColor: isOverflow ? '#EF4444' : isComplete ? '#10B981' : item.color
                                  },
                                ]}
                              />
                            </View>
                          </View>
                        );
                      })}

                      {/* Total Summary */}
                      <View style={styles.breakdownTotal}>
                        <View style={styles.breakdownTotalHeader}>
                          <Text style={styles.breakdownTotalLabel}>Total Progress</Text>
                          <Text style={styles.breakdownTotalCount}>
                            {totalActual} / {totalPlanned} units
                          </Text>
                        </View>
                        <View style={styles.breakdownTotalBar}>
                          <View
                            style={[
                              styles.breakdownTotalBarFill,
                              { width: `${Math.min(totalProgress, 100)}%` },
                            ]}
                          />
                        </View>
                        <Text style={styles.breakdownTotalProgress}>
                          {totalProgress}% Complete
                        </Text>
                      </View>
                    </>
                  );
                })()}
              </View>
            </Animated.View>
          )}

          {/* Units Section */}
          <Animated.View entering={FadeInDown.delay(150).duration(300)} style={styles.detailsSection}>
            <View style={styles.detailsSectionHeader}>
              <Ionicons name="grid" size={20} color="#1F2937" />
              <Text style={styles.detailsSectionTitle}>Unit Inventory</Text>
              <View style={styles.detailsCountBadge}>
                <Text style={styles.detailsCountBadgeText}>{buildingUnitsData.length}</Text>
              </View>
            </View>
            <View style={styles.detailsSectionContent}>
              {buildingUnitsData.length > 0 ? (
                buildingUnitsData.slice(0, 10).map(renderUnitItem)
              ) : (
                <View style={styles.detailsEmptyState}>
                  <Ionicons name="home-outline" size={40} color="#D1D5DB" />
                  <Text style={styles.detailsEmptyText}>No units recorded yet</Text>
                </View>
              )}
              {buildingUnitsData.length > 10 && (
                <Text style={styles.detailsShowMoreText}>
                  + {buildingUnitsData.length - 10} more units
                </Text>
              )}
            </View>
          </Animated.View>

          {/* Employees Section */}
          <Animated.View entering={FadeInDown.delay(200).duration(300)} style={styles.detailsSection}>
            <View style={styles.detailsSectionHeader}>
              <Ionicons name="people" size={20} color="#1F2937" />
              <Text style={styles.detailsSectionTitle}>Building Employees</Text>
              <View style={styles.detailsCountBadge}>
                <Text style={styles.detailsCountBadgeText}>{employees.length}</Text>
              </View>
            </View>
            <View style={styles.detailsSectionContent}>
              {employees.length > 0 ? (
                employees.map(renderEmployeeItem)
              ) : (
                <View style={styles.detailsEmptyState}>
                  <Ionicons name="people-outline" size={40} color="#D1D5DB" />
                  <Text style={styles.detailsEmptyText}>No employees assigned</Text>
                </View>
              )}
            </View>
          </Animated.View>

          {/* Service Providers Section */}
          <Animated.View entering={FadeInDown.delay(250).duration(300)} style={styles.detailsSection}>
            <View style={styles.detailsSectionHeader}>
              <Ionicons name="construct" size={20} color="#1F2937" />
              <Text style={styles.detailsSectionTitle}>Service Providers</Text>
              <View style={styles.detailsCountBadge}>
                <Text style={styles.detailsCountBadgeText}>{providerCards.length}</Text>
              </View>
            </View>
            <View style={styles.detailsSectionContent}>
              {providerCards.length > 0 ? (
                providerCards
              ) : (
                <View style={styles.detailsEmptyState}>
                  <Ionicons name="hammer-outline" size={40} color="#D1D5DB" />
                  <Text style={styles.detailsEmptyText}>No service providers yet</Text>
                </View>
              )}
            </View>
          </Animated.View>

          {/* Visitor Logs Section */}
          <Animated.View entering={FadeInDown.delay(300).duration(300)} style={styles.detailsSection}>
            <View style={styles.detailsSectionHeader}>
              <Ionicons name="log-in" size={20} color="#1F2937" />
              <Text style={styles.detailsSectionTitle}>Recent Visitors & Deliveries</Text>
              <View style={styles.detailsCountBadge}>
                <Text style={styles.detailsCountBadgeText}>{visitorEntries.length}</Text>
              </View>
            </View>
            <View style={styles.detailsSectionContent}>
              {visitorEntries.length > 0 ? (
                visitorEntries.slice(0, 5).map(renderVisitorLogItem)
              ) : (
                <View style={styles.detailsEmptyState}>
                  <Ionicons name="log-in-outline" size={40} color="#D1D5DB" />
                  <Text style={styles.detailsEmptyText}>No visitor activity recorded</Text>
                </View>
              )}
            </View>
          </Animated.View>

          <View style={{ height: 32 }} />
        </ScrollView>
      </SafeAreaView>
    );
  };


  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Animated.View entering={FadeIn.duration(200)} style={styles.detailsModalFullScreen}>
        {renderDetailsModalContent()}
      </Animated.View>
    </Modal>
  );
}
