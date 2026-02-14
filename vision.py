if label == "bottle":
    label = detection.label # This might be "bottle", "person", "cup", etc.
    requests.post("http://localhost:5000/resource_found", json={'label': label})

# Send the raw label text to the backend
    