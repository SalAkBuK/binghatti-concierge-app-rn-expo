import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Modal, ScrollView, Text, TouchableOpacity, View } from "react-native";

import type { BillSummary } from "../../../lib/types";
import { styles } from "./_styles";

interface Props {
  bill: BillSummary | null;
  visible: boolean;
  isCompact: boolean;
  onClose: () => void;
}

export function BillDetailModal({
  bill,
  visible,
  isCompact,
  onClose,
}: Props) {
  if (!bill) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, isCompact && styles.modalContentCompact]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Bill Details</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalBody}>
            <Text style={styles.detailLabel}>Building & Unit</Text>
            <Text style={styles.detailValue}>
              {bill.buildingName} - Unit {bill.unitNumber}
            </Text>

            <Text style={styles.detailLabel}>Tenant</Text>
            <Text style={styles.detailValue}>{bill.tenantName}</Text>

            <Text style={styles.detailLabel}>Billing Period</Text>
            <Text style={styles.detailValue}>{bill.billingPeriod}</Text>

            <View style={styles.billBreakdown}>
              <Text style={styles.breakdownTitle}>Charges Breakdown:</Text>

              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Rent</Text>
                <Text style={styles.breakdownValue}>
                  AED {bill.rentAmount.toFixed(2)}
                </Text>
              </View>

              {bill.gasCharges !== undefined && bill.gasCharges > 0 && (
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Gas</Text>
                  <Text style={styles.breakdownValue}>
                    AED {bill.gasCharges.toFixed(2)}
                  </Text>
                </View>
              )}

              {bill.waterCharges !== undefined && bill.waterCharges > 0 && (
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Water</Text>
                  <Text style={styles.breakdownValue}>
                    AED {bill.waterCharges.toFixed(2)}
                  </Text>
                </View>
              )}

              {bill.electricityCharges !== undefined && bill.electricityCharges > 0 && (
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Electricity</Text>
                  <Text style={styles.breakdownValue}>
                    AED {bill.electricityCharges.toFixed(2)}
                  </Text>
                </View>
              )}

              {bill.maintenanceCharges !== undefined && bill.maintenanceCharges > 0 && (
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Maintenance</Text>
                  <Text style={styles.breakdownValue}>
                    AED {bill.maintenanceCharges.toFixed(2)}
                  </Text>
                </View>
              )}

              {bill.otherCharges !== undefined && bill.otherCharges > 0 && (
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Other</Text>
                  <Text style={styles.breakdownValue}>
                    AED {bill.otherCharges.toFixed(2)}
                  </Text>
                </View>
              )}

              <View style={[styles.breakdownRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>
                  AED {bill.totalAmount.toFixed(2)}
                </Text>
              </View>

              {bill.paidAmount !== undefined && bill.paidAmount > 0 && (
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Paid</Text>
                  <Text style={[styles.breakdownValue, styles.paidText]}>
                    AED {bill.paidAmount.toFixed(2)}
                  </Text>
                </View>
              )}

              {bill.balanceAmount !== undefined && bill.balanceAmount > 0 && (
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Balance</Text>
                  <Text style={[styles.breakdownValue, styles.balanceText]}>
                    AED {bill.balanceAmount.toFixed(2)}
                  </Text>
                </View>
              )}
            </View>

            <Text style={styles.detailLabel}>Due Date</Text>
            <Text style={styles.detailValue}>
              {new Date(bill.dueDate).toLocaleDateString()}
            </Text>

            {bill.paidDate && (
              <>
                <Text style={styles.detailLabel}>Paid Date</Text>
                <Text style={styles.detailValue}>
                  {new Date(bill.paidDate).toLocaleDateString()}
                </Text>
              </>
            )}

            {bill.paymentMethod && (
              <>
                <Text style={styles.detailLabel}>Payment Method</Text>
                <Text style={styles.detailValue}>{bill.paymentMethod}</Text>
              </>
            )}

            {bill.transactionId && (
              <>
                <Text style={styles.detailLabel}>Transaction ID</Text>
                <Text style={styles.detailValue}>{bill.transactionId}</Text>
              </>
            )}

            {bill.notes && (
              <>
                <Text style={styles.detailLabel}>Notes</Text>
                <Text style={styles.detailValue}>{bill.notes}</Text>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
