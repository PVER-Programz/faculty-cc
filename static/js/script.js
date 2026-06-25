document.addEventListener('DOMContentLoaded', () => {
    const stars = document.querySelectorAll('.star');
    const ratingInput = document.getElementById('rating-value');
    const reviewForm = document.getElementById('review-form');
    const facultyId = reviewForm.getAttribute('data-faculty-id');
    const formMessage = document.getElementById('form-message');
    const reviewsContainer = document.getElementById('reviews-container');
    const avgRatingContainer = document.getElementById('average-rating');
    
    // Star Rating Logic
    stars.forEach(star => {
        star.addEventListener('mouseover', function() {
            const val = this.getAttribute('data-value');
            highlightStars(val);
        });
        
        star.addEventListener('mouseout', function() {
            const currentRating = ratingInput.value;
            highlightStars(currentRating);
        });
        
        star.addEventListener('click', function() {
            const val = this.getAttribute('data-value');
            ratingInput.value = val;
            highlightStars(val);
            
            // Add a little pop animation
            this.style.transform = 'scale(1.3)';
            setTimeout(() => {
                this.style.transform = '';
            }, 200);
        });
    });
    
    function highlightStars(val) {
        stars.forEach(s => {
            if (s.getAttribute('data-value') <= val) {
                s.classList.add('active');
                s.classList.replace('fa-regular', 'fa-solid');
            } else {
                s.classList.remove('active');
                if (val == 0) {
                    s.classList.replace('fa-solid', 'fa-regular');
                }
            }
        });
    }
    
    // Initial fetch of reviews
    // Wait for firebase SDK to load
    setTimeout(fetchReviews, 500);
    
    // Form Submission
    reviewForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const rating = ratingInput.value;
        const comment = document.getElementById('comment').value;
        const submitBtn = document.getElementById('submit-btn');
        const originalBtnHtml = submitBtn.innerHTML;
        
        if (rating == 0) {
            showMessage('Please select a star rating.', 'error');
            return;
        }
        
        // Loading state
        submitBtn.classList.add('loading');
        submitBtn.innerHTML = '<i class="fa-solid fa-circle-notch"></i> Submitting...';
        submitBtn.disabled = true;
        
        try {
            const db = window.firebaseDb;
            const entriesRef = window.firebaseCollection(db, `reviews/${facultyId}/entries`);
            
            await window.firebaseAddDoc(entriesRef, {
                rating: parseInt(rating),
                comment: comment,
                timestamp: window.firebaseServerTimestamp()
            });
            
            showMessage('Review submitted successfully!', 'success');
            reviewForm.reset();
            ratingInput.value = 0;
            highlightStars(0);
            
            // Refresh reviews
            fetchReviews();
        } catch (error) {
            console.error(error);
            showMessage('Failed to submit review.', 'error');
        } finally {
            submitBtn.classList.remove('loading');
            submitBtn.innerHTML = originalBtnHtml;
            submitBtn.disabled = false;
        }
    });
    
    function showMessage(msg, type) {
        formMessage.textContent = msg;
        formMessage.className = `form-message ${type}`;
        setTimeout(() => {
            formMessage.className = 'form-message';
        }, 3000);
    }
    
    // Fetch Reviews
    async function fetchReviews() {
        if (!window.firebaseDb) {
            setTimeout(fetchReviews, 500);
            return;
        }
        
        try {
            const db = window.firebaseDb;
            const entriesRef = window.firebaseCollection(db, `reviews/${facultyId}/entries`);
            const q = window.firebaseQuery(entriesRef, window.firebaseOrderBy('timestamp', 'desc'));
            
            const querySnapshot = await window.firebaseGetDocs(q);
            const reviews = [];
            querySnapshot.forEach((doc) => {
                reviews.push(doc.data());
            });
            
            renderReviews(reviews);
        } catch (error) {
            console.error(error);
            reviewsContainer.innerHTML = `<p class="no-reviews" style="color: #ef4444;">Could not load reviews. Ensure database is configured.</p>`;
        }
    }
    
    function renderReviews(reviews) {
        if (reviews.length === 0) {
            reviewsContainer.innerHTML = '<p class="no-reviews">No reviews yet. Be the first to drop one!</p>';
            avgRatingContainer.innerHTML = '';
            return;
        }
        
        // Calculate average rating
        const total = reviews.reduce((acc, rev) => acc + parseInt(rev.rating), 0);
        const avg = (total / reviews.length).toFixed(1);
        
        avgRatingContainer.innerHTML = `<div class="avg-rating-badge"><i class="fa-solid fa-star"></i> ${avg} / 5.0</div>`;
        
        reviewsContainer.innerHTML = '';
        reviews.forEach(review => {
            let dateStr = 'Just now';
            if (review.timestamp) {
                // Handle Firebase Timestamp
                const date = review.timestamp.toDate ? review.timestamp.toDate() : new Date();
                dateStr = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
            }
            
            let starsHtml = '';
            for (let i = 1; i <= 5; i++) {
                starsHtml += `<i class="fa-${i <= review.rating ? 'solid' : 'regular'} fa-star"></i>`;
            }
            
            const reviewEl = document.createElement('div');
            reviewEl.className = 'review-card';
            reviewEl.innerHTML = `
                <div class="review-header">
                    <div class="review-stars">${starsHtml}</div>
                    <div class="review-date">${dateStr}</div>
                </div>
                ${review.comment ? `<div class="review-comment">${escapeHtml(review.comment)}</div>` : ''}
            `;
            reviewsContainer.appendChild(reviewEl);
        });
    }
    
    function escapeHtml(unsafe) {
        return unsafe
             .replace(/&/g, "&amp;")
             .replace(/</g, "&lt;")
             .replace(/>/g, "&gt;")
             .replace(/"/g, "&quot;")
             .replace(/'/g, "&#039;");
    }
});
