import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";

interface StarRatingProps {
  rating: number; // 1-5
  size?: number;
  onRatingChange?: (rating: number) => void;
  color?: string;
  emptyColor?: string;
}

export const StarRating: React.FC<StarRatingProps> = ({
  rating,
  size = 24,
  onRatingChange,
  color = "#FFD700",
  emptyColor = "#D1D5DB",
}) => {
  const isInteractive = !!onRatingChange;

  const renderStar = (index: number) => {
    const starNumber = index + 1;
    const isFilled = starNumber <= rating;
    const starColor = isFilled ? color : emptyColor;

    if (isInteractive) {
      return (
        <TouchableOpacity
          key={index}
          onPress={() => onRatingChange(starNumber)}
          style={styles.starButton}
        >
          <Ionicons
            name={isFilled ? "star" : "star-outline"}
            size={size}
            color={starColor}
          />
        </TouchableOpacity>
      );
    }

    return (
      <View key={index} style={styles.starView}>
        <Ionicons
          name={isFilled ? "star" : "star-outline"}
          size={size}
          color={starColor}
        />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {[0, 1, 2, 3, 4].map((index) => renderStar(index))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  starButton: {
    padding: 4,
  },
  starView: {
    padding: 4,
  },
});
