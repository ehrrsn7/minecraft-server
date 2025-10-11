#!/bin/bash
#
# git-status-report.sh v4
#
# Generates a markdown table comparing on-disk size vs. the size of
# untracked files, sorted by size, with conditional formatting.
# - Bold: Items with untracked files to be committed.
# - Italic: Items that are ignored, already tracked, or internal.

# --- Data Collection ---
# We first collect all data into a temporary string so we can sort it
# before printing the final table.
table_data=""
for item in ./*; do
  [ -e "$item" ] || continue # Skip if loop runs on an empty directory

  name="${item#./}"
  disk_size_bytes=$(du -sb "$item" | awk '{print $1}') # Get size in bytes for accurate sorting
  disk_size_human=$(du -sh "$item" | awk '{print $1}') # Get human-readable size for display

  # Calculate the total size of untracked files within this item's path
  commit_size_raw=$(git ls-files -oc --exclude-standard "$item" | xargs -r -d '\n' du -ch 2>/dev/null | tail -n1)

  commit_size="0B" # Default to 0 if no untracked files are found
  if [[ -n "$commit_size_raw" ]]; then
    commit_size=$(echo "$commit_size_raw" | awk '{print $1}')
  fi

  # Format the 'commit size' column for clarity and add markdown styling
  if [ "$name" == ".git" ]; then
    # Italic for .git internal
    name_display="*${name}*"
    disk_size_display="*${disk_size_human}*"
    commit_display_styled="*N/A (Git Internal)*"
  elif [ "$commit_size" == "0B" ]; then
    # Italic for ignored or tracked files
    name_display="*${name}*"
    disk_size_display="*${disk_size_human}*"
    commit_display_styled="*Ignored or Already Tracked*"
  else
    # Bold for files to be committed
    name_display="**${name}**"
    disk_size_display="**${disk_size_human}**"
    commit_display_styled="**${commit_size}**"
  fi

  # Append a line to our data string, using tabs as a separator.
  # We lead with bytes for sorting. The rest are pre-formatted for display.
  table_data+="${disk_size_bytes}\t${name_display}\t${disk_size_display}\t${commit_display_styled}\n"
done

# --- Table Generation ---
# Now, print the collected and sorted data.

# Print the table header
printf "| %-37s | %-20s | %-42s |\n" "Top-Level Folder or File Name" "File Size on Disk" "Size to be Added in Commit"
printf "|-%-37s-|-%-20s-|-%-42s-|\n" "-------------------------------------" "--------------------" "------------------------------------------"

# Sort the collected data numerically in reverse order (largest first) and print each row.
# The `while` loop reads the sorted output line by line.
echo -e "${table_data}" | sort -nr -k1,1 | while IFS=$'\t' read -r size_bytes name_display disk_size_display commit_display_styled; do
  # Adjust padding slightly to make raw text look better with markdown characters
  printf "| %-37s | %-20s | %-42s |\n" "$name_display" "$disk_size_display" "$commit_display_styled"
done

# --- Add the Totals Row ---
total_disk_size=$(du -sh . | awk '{print $1}')
total_commit_size=$(git ls-files -oc --exclude-standard . | xargs -r -d '\n' du -ch 2>/dev/null | tail -n1 | awk '{print $1}')
[ -z "$total_commit_size" ] && total_commit_size="0B" # Handle case where nothing is to be added

printf "|-%-37s-|-%-20s-|-%-42s-|\n" "-------------------------------------" "--------------------" "------------------------------------------"
printf "| %-37s | %-20s | %-42s |\n" "**Total**" "**$total_disk_size**" "**$total_commit_size (to be added)**"

