import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { JobCard } from "../../../../components/admin/JobCard";
import type { Job } from "../../../../lib/types";
import { styles } from "../_styles";

interface JobsListProps {
  jobs: Job[];
  onSelect: (job: Job) => void;
}

export function JobsList({ jobs, onSelect }: JobsListProps) {
  if (!jobs.length) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyStateText}>No jobs found</Text>
      </View>
    );
  }

  return (
    <>
      {jobs.map((job, index) => (
        <Animated.View
          key={job.id}
          entering={FadeInDown.delay(150 + index * 50).duration(400)}
        >
          <TouchableOpacity
            onPress={() => onSelect(job)}
            style={styles.jobCardWrapper}
          >
            <JobCard job={job} />
          </TouchableOpacity>
        </Animated.View>
      ))}
    </>
  );
}
